import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadToS3,
  uploadToOSS,
  uploadToImgur,
  uploadToCustom,
  uploadToProvider,
  testProviderConnection,
  CLOUD_IMAGE_PROVIDERS,
} from './imageStorageConfig';
import type { S3Config, OSSConfig, ImgurConfig, CustomConfig, ImageHostingProvider } from './imageStorageConfig';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  } as unknown as Response;
}

function createTestBlob(): Blob {
  return new Blob(['test-image-data'], { type: 'image/png' });
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// uploadToS3
// ---------------------------------------------------------------------------

describe('uploadToS3', () => {
  it('constructs correct S3 endpoint URL and returns public URL', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const config: S3Config = {
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKey: 'access',
      secretKey: 'secret',
      publicUrlPrefix: 'https://cdn.example.com',
    };

    const blob = createTestBlob();
    const result = await uploadToS3(blob, config, 'test-image.png');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/my-bucket/test-image.png',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'image/png',
          'x-amz-acl': 'public-read',
        }),
        body: blob,
      })
    );

    expect(result).toContain('https://cdn.example.com/test-image.png');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(403, { error: 'Forbidden' }));

    const config: S3Config = {
      endpoint: 'https://s3.example.com',
      bucket: 'bucket',
      region: 'us-east-1',
      accessKey: 'access',
      secretKey: 'secret',
      publicUrlPrefix: 'https://cdn.example.com',
    };

    await expect(
      uploadToS3(createTestBlob(), config, 'file.png')
    ).rejects.toThrow(/S3 upload failed/);
  });
});

// ---------------------------------------------------------------------------
// uploadToOSS
// ---------------------------------------------------------------------------

describe('uploadToOSS', () => {
  it('constructs correct OSS endpoint URL and returns public URL', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const config: OSSConfig = {
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      bucket: 'my-oss-bucket',
      accessKey: 'access',
      secretKey: 'secret',
      publicUrlPrefix: 'https://my-oss-bucket.oss-cn-hangzhou.aliyuncs.com',
    };

    const result = await uploadToOSS(createTestBlob(), config, 'photo.png');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://oss-cn-hangzhou.aliyuncs.com/my-oss-bucket/photo.png',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'image/png',
        }),
      })
    );

    expect(result).toBe('https://my-oss-bucket.oss-cn-hangzhou.aliyuncs.com/photo.png');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(500, { error: 'Internal Error' }));

    const config: OSSConfig = {
      endpoint: 'https://oss.example.com',
      bucket: 'bucket',
      accessKey: 'access',
      secretKey: 'secret',
      publicUrlPrefix: 'https://cdn.example.com',
    };

    await expect(
      uploadToOSS(createTestBlob(), config, 'file.png')
    ).rejects.toThrow(/OSS upload failed/);
  });
});

// ---------------------------------------------------------------------------
// uploadToImgur
// ---------------------------------------------------------------------------

describe('uploadToImgur', () => {
  it('calls Imgur API and returns image link', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, {
        success: true,
        data: { link: 'https://i.imgur.com/abc123.png' },
      })
    );

    const config: ImgurConfig = {
      clientId: 'my-client-id',
    };

    const result = await uploadToImgur(createTestBlob(), config);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.imgur.com/3/image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Client-ID my-client-id',
        }),
        body: expect.any(FormData),
      })
    );

    expect(result).toBe('https://i.imgur.com/abc123.png');
  });

  it('throws on Imgur API error response', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(400, {
        success: false,
        data: { error: 'Invalid image' },
      })
    );

    const config: ImgurConfig = { clientId: 'id' };

    await expect(
      uploadToImgur(createTestBlob(), config)
    ).rejects.toThrow(/Imgur upload failed/);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(429, { error: 'Rate limited' })
    );

    const config: ImgurConfig = { clientId: 'id' };

    await expect(
      uploadToImgur(createTestBlob(), config)
    ).rejects.toThrow(/Imgur upload failed/);
  });
});

// ---------------------------------------------------------------------------
// uploadToCustom
// ---------------------------------------------------------------------------

describe('uploadToCustom', () => {
  it('calls custom endpoint and returns URL from response', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, {
        url: 'https://custom.example.com/images/abc.png',
      })
    );

    const config: CustomConfig = {
      uploadUrl: 'https://custom.example.com/upload',
      headers: { 'X-Custom-Header': 'value' },
      formField: 'file',
    };

    const result = await uploadToCustom(createTestBlob(), config);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.example.com/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Custom-Header': 'value',
        }),
        body: expect.any(FormData),
      })
    );

    expect(result).toBe('https://custom.example.com/images/abc.png');
  });

  it('extracts URL from data.link field', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, {
        data: { link: 'https://cdn.example.com/img.png' },
      })
    );

    const config: CustomConfig = {
      uploadUrl: 'https://api.example.com/upload',
      headers: {},
      formField: 'image',
    };

    const result = await uploadToCustom(createTestBlob(), config);
    expect(result).toBe('https://cdn.example.com/img.png');
  });

  it('extracts URL from data.url field', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, {
        data: { url: 'https://cdn.example.com/img2.png' },
      })
    );

    const config: CustomConfig = {
      uploadUrl: 'https://api.example.com/upload',
      headers: {},
      formField: 'image',
    };

    const result = await uploadToCustom(createTestBlob(), config);
    expect(result).toBe('https://cdn.example.com/img2.png');
  });

  it('throws when response has no recognizable URL field', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, { message: 'done' })
    );

    const config: CustomConfig = {
      uploadUrl: 'https://api.example.com/upload',
      headers: {},
      formField: 'file',
    };

    await expect(
      uploadToCustom(createTestBlob(), config)
    ).rejects.toThrow(/recognizable URL/);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(500, { error: 'Server error' })
    );

    const config: CustomConfig = {
      uploadUrl: 'https://api.example.com/upload',
      headers: {},
      formField: 'file',
    };

    await expect(
      uploadToCustom(createTestBlob(), config)
    ).rejects.toThrow(/Custom upload failed/);
  });
});

// ---------------------------------------------------------------------------
// uploadToProvider routing
// ---------------------------------------------------------------------------

describe('uploadToProvider', () => {
  it('routes to uploadToS3 for s3 type', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const provider: ImageHostingProvider = {
      id: 's3-provider',
      name: 'S3 Test',
      type: 's3',
      config: {
        endpoint: 'https://s3.example.com',
        bucket: 'test-bucket',
        region: 'us-east-1',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await uploadToProvider(createTestBlob(), provider);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://s3.example.com/test-bucket/'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(result).toContain('https://cdn.example.com/');
  });

  it('routes to uploadToOSS for oss type', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const provider: ImageHostingProvider = {
      id: 'oss-provider',
      name: 'OSS Test',
      type: 'oss',
      config: {
        endpoint: 'https://oss.example.com',
        bucket: 'test-bucket',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await uploadToProvider(createTestBlob(), provider);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://oss.example.com/test-bucket/'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(result).toContain('https://cdn.example.com/');
  });

  it('routes to uploadToImgur for imgur type', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, {
        success: true,
        data: { link: 'https://i.imgur.com/xyz.png' },
      })
    );

    const provider: ImageHostingProvider = {
      id: 'imgur-provider',
      name: 'Imgur Test',
      type: 'imgur',
      config: { clientId: 'test-client-id' },
    };

    const result = await uploadToProvider(createTestBlob(), provider);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.imgur.com/3/image',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toBe('https://i.imgur.com/xyz.png');
  });

  it('routes to uploadToCustom for custom type', async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse(200, { url: 'https://custom.host/img.png' })
    );

    const provider: ImageHostingProvider = {
      id: 'custom-provider',
      name: 'Custom Test',
      type: 'custom',
      config: {
        uploadUrl: 'https://custom.host/upload',
        headers: {},
        formField: 'image',
      },
    };

    const result = await uploadToProvider(createTestBlob(), provider);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.host/upload',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toBe('https://custom.host/img.png');
  });
});

// ---------------------------------------------------------------------------
// testProviderConnection
// ---------------------------------------------------------------------------

describe('testProviderConnection', () => {
  it('returns true for S3 when bucket is reachable', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const provider: ImageHostingProvider = {
      id: 's3',
      name: 'S3',
      type: 's3',
      config: {
        endpoint: 'https://s3.example.com',
        bucket: 'bucket',
        region: 'us-east-1',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(true);
  });

  it('returns true for S3 with 403 (listing denied but reachable)', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(403, {}));

    const provider: ImageHostingProvider = {
      id: 's3',
      name: 'S3',
      type: 's3',
      config: {
        endpoint: 'https://s3.example.com',
        bucket: 'bucket',
        region: 'us-east-1',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(true);
  });

  it('returns false for S3 on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const provider: ImageHostingProvider = {
      id: 's3',
      name: 'S3',
      type: 's3',
      config: {
        endpoint: 'https://s3.example.com',
        bucket: 'bucket',
        region: 'us-east-1',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(false);
  });

  it('returns true for Imgur when API is reachable', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const provider: ImageHostingProvider = {
      id: 'imgur',
      name: 'Imgur',
      type: 'imgur',
      config: { clientId: 'client-id' },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(true);
  });

  it('returns false for Imgur on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const provider: ImageHostingProvider = {
      id: 'imgur',
      name: 'Imgur',
      type: 'imgur',
      config: { clientId: 'client-id' },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(false);
  });

  it('returns false for OSS on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const provider: ImageHostingProvider = {
      id: 'oss',
      name: 'OSS',
      type: 'oss',
      config: {
        endpoint: 'https://oss.example.com',
        bucket: 'bucket',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(false);
  });

  it('returns false for custom on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const provider: ImageHostingProvider = {
      id: 'custom',
      name: 'Custom',
      type: 'custom',
      config: {
        uploadUrl: 'https://api.example.com/upload',
        headers: {},
        formField: 'file',
      },
    };

    const result = await testProviderConnection(provider);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CLOUD_IMAGE_PROVIDERS integrity
// ---------------------------------------------------------------------------

describe('CLOUD_IMAGE_PROVIDERS', () => {
  it('has 5 providers with valid configs', () => {
    expect(CLOUD_IMAGE_PROVIDERS).toHaveLength(5);
  });

  it('each provider has id, name, description, endpointTemplate, requiresRegion', () => {
    for (const provider of CLOUD_IMAGE_PROVIDERS) {
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('description');
      expect(provider).toHaveProperty('endpointTemplate');
      expect(provider).toHaveProperty('requiresRegion');

      expect(typeof provider.id).toBe('string');
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.description).toBe('string');
      expect(typeof provider.requiresRegion).toBe('boolean');
    }
  });

  it('has no duplicate IDs', () => {
    const ids = CLOUD_IMAGE_PROVIDERS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('S3 and OSS providers require region', () => {
    const oss = CLOUD_IMAGE_PROVIDERS.find((p) => p.id === 'oss');
    const cos = CLOUD_IMAGE_PROVIDERS.find((p) => p.id === 'cos');
    const s3 = CLOUD_IMAGE_PROVIDERS.find((p) => p.id === 's3');

    expect(oss!.requiresRegion).toBe(true);
    expect(cos!.requiresRegion).toBe(true);
    expect(s3!.requiresRegion).toBe(true);
  });

  it('R2 and custom providers do not require region', () => {
    const r2 = CLOUD_IMAGE_PROVIDERS.find((p) => p.id === 'r2');
    const custom = CLOUD_IMAGE_PROVIDERS.find((p) => p.id === 'custom');

    expect(r2!.requiresRegion).toBe(false);
    expect(custom!.requiresRegion).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateFilename (tested indirectly via uploadToS3 / uploadToProvider)
// ---------------------------------------------------------------------------

describe('generateFilename (indirectly)', () => {
  it('produces filenames matching the expected pattern via uploadToS3', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const config: S3Config = {
      endpoint: 'https://s3.example.com',
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKey: 'ak',
      secretKey: 'sk',
      publicUrlPrefix: 'https://cdn.example.com',
    };

    const result = await uploadToS3(createTestBlob(), config, 'myfile.png');

    expect(result).toContain('myfile.png');
  });

  it('generates unique filenames via uploadToProvider for OSS', async () => {
    mockFetch.mockResolvedValue(mockFetchResponse(200, {}));

    const calls: string[] = [];
    mockFetch.mockImplementation((url: string) => {
      calls.push(url);
      return Promise.resolve(mockFetchResponse(200, {}));
    });

    const provider: ImageHostingProvider = {
      id: 'oss-test',
      name: 'OSS',
      type: 'oss',
      config: {
        endpoint: 'https://oss.example.com',
        bucket: 'bucket',
        accessKey: 'ak',
        secretKey: 'sk',
        publicUrlPrefix: 'https://cdn.example.com',
      },
    };

    // Two separate uploads should generate different filenames
    await uploadToProvider(createTestBlob(), provider);
    await uploadToProvider(createTestBlob(), provider);

    const filename1 = calls[0].split('/').pop();
    const filename2 = calls[1].split('/').pop();

    expect(filename1).not.toBe(filename2);
    expect(filename1).toMatch(/^image_\d+_[a-z0-9]+\.png$/);
  });
});
