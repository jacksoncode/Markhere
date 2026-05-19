export interface ImageHostingProvider {
  id: string;
  name: string;
  type: 's3' | 'oss' | 'imgur' | 'custom';
  config: S3Config | OSSConfig | ImgurConfig | CustomConfig;
}

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  publicUrlPrefix: string;
}

export interface OSSConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrlPrefix: string;
}

export interface ImgurConfig {
  clientId: string;
}

export interface CustomConfig {
  uploadUrl: string;
  headers: Record<string, string>;
  formField: string; // field name for the file
}

export type ImageStorageMode = 'local' | 'relative' | 'cloud';

export interface ImageStorageConfig {
  mode: ImageStorageMode;
  localPath: string;
  relativePath: string;
  cloudProvider: 'none' | 'oss' | 'cos' | 's3' | 'r2' | 'custom';
  cloudConfig?: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    region?: string;
    customUrl?: string;
  };
}

export interface CloudImageProvider {
  id: string;
  name: string;
  description: string;
  endpointTemplate: string;
  requiresRegion: boolean;
}

export const CLOUD_IMAGE_PROVIDERS: CloudImageProvider[] = [
  {
    id: 'oss',
    name: '阿里云 OSS',
    description: '阿里云对象存储服务',
    endpointTemplate: 'https://oss-{region}.aliyuncs.com',
    requiresRegion: true,
  },
  {
    id: 'cos',
    name: '腾讯云 COS',
    description: '腾讯云对象存储服务',
    endpointTemplate: 'https://cos.{region}.myqcloud.com',
    requiresRegion: true,
  },
  {
    id: 's3',
    name: 'AWS S3',
    description: '亚马逊对象存储服务',
    endpointTemplate: 'https://s3.{region}.amazonaws.com',
    requiresRegion: true,
  },
  {
    id: 'r2',
    name: 'Cloudflare R2',
    description: 'Cloudflare对象存储，免流量费用',
    endpointTemplate: 'https://{account_id}.r2.cloudflarestorage.com',
    requiresRegion: false,
  },
  {
    id: 'custom',
    name: '自定义图床',
    description: '自定义API端点的图床服务',
    endpointTemplate: '',
    requiresRegion: false,
  },
];

export const DEFAULT_IMAGE_STORAGE: ImageStorageConfig = {
  mode: 'relative',
  localPath: '',
  relativePath: './images',
  cloudProvider: 'none',
};

// ---- Upload functions for external hosting providers ----

function generateFilename(): string {
  return `image_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
}

/**
 * Upload a file blob to an S3-compatible storage endpoint.
 * Uses the AWS Signature V4 signing process.
 */
export async function uploadToS3(
  file: Blob,
  config: S3Config,
  filename: string,
): Promise<string> {
  const { endpoint, bucket, publicUrlPrefix } = config;

  const uploadUrl = `${endpoint}/${bucket}/${filename}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-amz-acl': 'public-read',
    },
    body: file,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText}${text ? ' - ' + text : ''}`);
  }

  const baseUrl = publicUrlPrefix.replace(/\/+$/, '');
  return `${baseUrl}/${filename}`;
}

/**
 * Upload a file blob to Alibaba Cloud OSS.
 */
export async function uploadToOSS(
  file: Blob,
  config: OSSConfig,
  filename: string,
): Promise<string> {
  const { endpoint, bucket, publicUrlPrefix } = config;

  const uploadUrl = `${endpoint}/${bucket}/${filename}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OSS upload failed: ${response.status} ${response.statusText}${text ? ' - ' + text : ''}`);
  }

  const baseUrl = publicUrlPrefix.replace(/\/+$/, '');
  return `${baseUrl}/${filename}`;
}

/**
 * Upload a file to Imgur (anonymous upload).
 * Returns the public image URL.
 */
export async function uploadToImgur(
  file: Blob,
  config: ImgurConfig,
): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', 'file');

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${config.clientId}`,
    },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Imgur upload failed: ${response.status} ${response.statusText}${text ? ' - ' + text : ''}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('Imgur upload failed: ' + JSON.stringify(data));
  }
  return data.data.link;
}

/**
 * Upload a file to a custom endpoint via multipart form data.
 * The file is sent in the form field specified by config.formField.
 */
export async function uploadToCustom(
  file: Blob,
  config: CustomConfig,
): Promise<string> {
  const formData = new FormData();
  formData.append(config.formField, file, generateFilename());

  const headers: Record<string, string> = {
    ...config.headers,
  };

  const response = await fetch(config.uploadUrl, {
    method: 'POST',
    headers,
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Custom upload failed: ${response.status} ${response.statusText}${text ? ' - ' + text : ''}`);
  }

  const data = await response.json();
  // Try common response field names for the URL
  const url = data.url || data.link || data.data?.url || data.data?.link || '';
  if (!url) {
    throw new Error('Custom upload response did not contain a recognizable URL field. Expected "url", "link", "data.url", or "data.link".');
  }
  return url;
}

/**
 * Upload a file using the given provider configuration.
 * Dispatches to the appropriate upload function based on provider type.
 */
export async function uploadToProvider(
  file: Blob,
  provider: ImageHostingProvider,
): Promise<string> {
  switch (provider.type) {
    case 's3':
      return uploadToS3(file, provider.config as S3Config, generateFilename());
    case 'oss':
      return uploadToOSS(file, provider.config as OSSConfig, generateFilename());
    case 'imgur':
      return uploadToImgur(file, provider.config as ImgurConfig);
    case 'custom':
      return uploadToCustom(file, provider.config as CustomConfig);
    default:
      throw new Error(`Unknown provider type: ${(provider as any).type}`);
  }
}

/**
 * Test connectivity to a provider by attempting a no-op request.
 * Returns true if the connection settings appear valid.
 */
export async function testProviderConnection(provider: ImageHostingProvider): Promise<boolean> {
  switch (provider.type) {
    case 's3': {
      const cfg = provider.config as S3Config;
      try {
        const resp = await fetch(`${cfg.endpoint}/${cfg.bucket}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });
        return resp.ok || resp.status === 403; // 403 means endpoint reached but listing denied (common for limited keys)
      } catch {
        return false;
      }
    }
    case 'oss': {
      const cfg = provider.config as OSSConfig;
      try {
        const resp = await fetch(`${cfg.endpoint}/${cfg.bucket}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });
        return resp.ok || resp.status === 403;
      } catch {
        return false;
      }
    }
    case 'imgur': {
      const cfg = provider.config as ImgurConfig;
      try {
        const resp = await fetch('https://api.imgur.com/3/credits', {
          headers: { Authorization: `Client-ID ${cfg.clientId}` },
          signal: AbortSignal.timeout(10000),
        });
        return resp.ok;
      } catch {
        return false;
      }
    }
    case 'custom': {
      const cfg = provider.config as CustomConfig;
      try {
        const resp = await fetch(cfg.uploadUrl, {
          method: 'OPTIONS',
          signal: AbortSignal.timeout(10000),
        });
        return resp.ok || resp.status === 405; // 405 = OPTIONS not allowed but endpoint exists
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}
