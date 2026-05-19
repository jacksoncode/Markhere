import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks must be hoisted above all imports
// ---------------------------------------------------------------------------
vi.mock('../services/imageStorageConfig', () => ({
  DEFAULT_IMAGE_STORAGE: {
    mode: 'relative' as const,
    localPath: '',
    relativePath: './images',
    cloudProvider: 'none' as const,
  },
  uploadToProvider: vi.fn().mockResolvedValue('https://cdn.example.com/img/image_001.png'),
}));

import { useImageStorageStore } from './imageStorageStore';
import { DEFAULT_IMAGE_STORAGE, uploadToProvider } from '../services/imageStorageConfig';
import type { ImageHostingProvider, S3Config } from '../services/imageStorageConfig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeS3Provider(overrides: Partial<ImageHostingProvider> = {}): ImageHostingProvider {
  return {
    id: 'aws-s3-1',
    name: 'AWS S3 Production',
    type: 's3',
    config: {
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKey: 'AKIA123',
      secretKey: 'secret123',
      publicUrlPrefix: 'https://my-bucket.s3.amazonaws.com',
    } as S3Config,
    ...overrides,
  };
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useImageStorageStore', () => {
  beforeEach(async () => {
    // Reset persisted state by setting back to initial values
    useImageStorageStore.setState({
      config: { ...DEFAULT_IMAGE_STORAGE },
      activeProvider: null,
      providers: [],
    });
    vi.mocked(uploadToProvider).mockClear();
    await flushPromises();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has default image storage config', () => {
      const { config } = useImageStorageStore.getState();
      expect(config.mode).toBe('relative');
      expect(config.relativePath).toBe('./images');
      expect(config.cloudProvider).toBe('none');
    });

    it('has null activeProvider', () => {
      expect(useImageStorageStore.getState().activeProvider).toBeNull();
    });

    it('has empty providers array', () => {
      expect(useImageStorageStore.getState().providers).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateConfig
  // -----------------------------------------------------------------------
  describe('updateConfig', () => {
    it('merges partial config into existing config', () => {
      const { updateConfig } = useImageStorageStore.getState();
      updateConfig({ mode: 'cloud', cloudProvider: 's3' });

      const { config } = useImageStorageStore.getState();
      expect(config.mode).toBe('cloud');
      expect(config.cloudProvider).toBe('s3');
      // Existing fields preserved
      expect(config.relativePath).toBe('./images');
    });

    it('allows updating a single field', () => {
      const { updateConfig } = useImageStorageStore.getState();
      updateConfig({ localPath: '/custom/images' });

      expect(useImageStorageStore.getState().config.localPath).toBe('/custom/images');
    });
  });

  // -----------------------------------------------------------------------
  // resetConfig
  // -----------------------------------------------------------------------
  describe('resetConfig', () => {
    it('restores config to defaults', () => {
      const { updateConfig, resetConfig } = useImageStorageStore.getState();
      updateConfig({
        mode: 'cloud',
        localPath: '/custom',
        relativePath: '/other',
        cloudProvider: 'oss',
      });

      resetConfig();

      const { config } = useImageStorageStore.getState();
      expect(config).toEqual(DEFAULT_IMAGE_STORAGE);
    });
  });

  // -----------------------------------------------------------------------
  // addProvider
  // -----------------------------------------------------------------------
  describe('addProvider', () => {
    it('adds a new provider to the list', () => {
      const provider = makeS3Provider();
      const { addProvider } = useImageStorageStore.getState();
      addProvider(provider);

      const { providers } = useImageStorageStore.getState();
      expect(providers).toHaveLength(1);
      expect(providers[0]).toEqual(provider);
    });

    it('appends provider to existing list', () => {
      const p1 = makeS3Provider({ id: 's3-1', name: 'First' });
      const p2 = makeS3Provider({ id: 's3-2', name: 'Second' });

      useImageStorageStore.setState({ providers: [p1] });
      const { addProvider } = useImageStorageStore.getState();
      addProvider(p2);

      const { providers } = useImageStorageStore.getState();
      expect(providers).toHaveLength(2);
      expect(providers[1].name).toBe('Second');
    });
  });

  // -----------------------------------------------------------------------
  // updateProvider
  // -----------------------------------------------------------------------
  describe('updateProvider', () => {
    it('updates an existing provider by id', () => {
      const provider = makeS3Provider({ id: 's3-1', name: 'Old Name' });
      useImageStorageStore.setState({ providers: [provider] });

      const { updateProvider } = useImageStorageStore.getState();
      updateProvider('s3-1', { name: 'New Name' });

      const { providers } = useImageStorageStore.getState();
      expect(providers[0].name).toBe('New Name');
    });

    it('does nothing when provider id not found', () => {
      const provider = makeS3Provider({ id: 's3-1' });
      useImageStorageStore.setState({ providers: [provider] });

      const { updateProvider } = useImageStorageStore.getState();
      updateProvider('non-existent', { name: 'Should Not Appear' });

      const { providers } = useImageStorageStore.getState();
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('AWS S3 Production');
    });
  });

  // -----------------------------------------------------------------------
  // deleteProvider
  // -----------------------------------------------------------------------
  describe('deleteProvider', () => {
    it('removes a provider by id', () => {
      const p1 = makeS3Provider({ id: 's3-1', name: 'First' });
      const p2 = makeS3Provider({ id: 's3-2', name: 'Second' });
      useImageStorageStore.setState({ providers: [p1, p2] });

      const { deleteProvider } = useImageStorageStore.getState();
      deleteProvider('s3-1');

      const { providers } = useImageStorageStore.getState();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('s3-2');
    });

    it('clears activeProvider if the deleted provider was active', () => {
      const p1 = makeS3Provider({ id: 's3-1' });
      useImageStorageStore.setState({ providers: [p1], activeProvider: 's3-1' });

      const { deleteProvider } = useImageStorageStore.getState();
      deleteProvider('s3-1');

      expect(useImageStorageStore.getState().activeProvider).toBeNull();
    });

    it('does not clear activeProvider if a different provider was deleted', () => {
      const p1 = makeS3Provider({ id: 's3-1' });
      const p2 = makeS3Provider({ id: 's3-2' });
      useImageStorageStore.setState({ providers: [p1, p2], activeProvider: 's3-2' });

      const { deleteProvider } = useImageStorageStore.getState();
      deleteProvider('s3-1');

      expect(useImageStorageStore.getState().activeProvider).toBe('s3-2');
    });
  });

  // -----------------------------------------------------------------------
  // setActiveProvider
  // -----------------------------------------------------------------------
  describe('setActiveProvider', () => {
    it('sets the active provider id', () => {
      const { setActiveProvider } = useImageStorageStore.getState();
      setActiveProvider('s3-1');

      expect(useImageStorageStore.getState().activeProvider).toBe('s3-1');
    });

    it('allows setting activeProvider to null', () => {
      useImageStorageStore.setState({ activeProvider: 's3-1' });

      const { setActiveProvider } = useImageStorageStore.getState();
      setActiveProvider(null);

      expect(useImageStorageStore.getState().activeProvider).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // uploadImage
  // -----------------------------------------------------------------------
  describe('uploadImage', () => {
    it('returns null when no active provider is set', async () => {
      const { uploadImage } = useImageStorageStore.getState();
      const file = new File(['fake-image'], 'test.png', { type: 'image/png' });
      const result = await uploadImage(file);

      expect(result).toBeNull();
    });

    it('returns null when active provider is not found in providers', async () => {
      useImageStorageStore.setState({ activeProvider: 'orphan-id' });

      const { uploadImage } = useImageStorageStore.getState();
      const file = new File(['fake-image'], 'test.png', { type: 'image/png' });
      const result = await uploadImage(file);

      expect(result).toBeNull();
    });

    it('calls uploadToProvider with the file and provider config', async () => {
      const provider = makeS3Provider({ id: 's3-1' });
      useImageStorageStore.setState({ providers: [provider], activeProvider: 's3-1' });

      const { uploadImage } = useImageStorageStore.getState();
      const file = new File(['fake-image-content'], 'photo.png', { type: 'image/png' });
      const result = await uploadImage(file);

      expect(uploadToProvider).toHaveBeenCalledWith(file, provider);
      expect(result).toBe('https://cdn.example.com/img/image_001.png');
    });

    it('returns the URL from uploadToProvider', async () => {
      vi.mocked(uploadToProvider).mockResolvedValueOnce('https://mycdn.com/uploads/img_abc.png');
      const provider = makeS3Provider({ id: 's3-1' });
      useImageStorageStore.setState({ providers: [provider], activeProvider: 's3-1' });

      const { uploadImage } = useImageStorageStore.getState();
      const file = new File(['data'], 'image.png', { type: 'image/png' });
      const result = await uploadImage(file);

      expect(result).toBe('https://mycdn.com/uploads/img_abc.png');
    });
  });
});
