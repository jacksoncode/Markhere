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