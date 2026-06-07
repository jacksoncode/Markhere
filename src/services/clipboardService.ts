import { invoke } from '@tauri-apps/api/core';

export class ClipboardService {

  static async pasteImage(): Promise<File | null> {
    const strategies = [
      { name: 'clipboardAPI', fn: this.pasteViaClipboardAPI },
      { name: 'dataTransfer', fn: this.pasteViaDataTransfer },
      { name: 'tauriNative', fn: this.pasteViaTauriPlugin },
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy.fn();
        if (result) {
          console.log(`✅ Paste succeeded with ${strategy.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error);
        continue;
      }
    }

    console.warn('❌ All paste strategies failed');
    return null;
  }

  private static async pasteViaClipboardAPI(): Promise<File | null> {
    if (!navigator.clipboard?.read) return null;

    const items = await navigator.clipboard.read();

    for (const item of items) {
      const imageTypes = item.types.filter(t =>
        t.startsWith('image/')
      );

      if (imageTypes.length > 0) {
        const blob = await item.getType(imageTypes[0]);
        return new File([blob], 'pasted-image.png', {
          type: imageTypes[0],
        });
      }
    }

    return null;
  }

  private static pasteViaDataTransfer(): Promise<File | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        document.removeEventListener('paste', handler);
        resolve(null);
      }, 500);

      const handler = (e: ClipboardEvent) => {
        clearTimeout(timeout);
        const items = e.clipboardData?.items;
        if (!items) {
          resolve(null);
          return;
        }

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            document.removeEventListener('paste', handler);
            resolve(file);
            return;
          }
        }

        document.removeEventListener('paste', handler);
        resolve(null);
      };

      document.addEventListener('paste', handler, { once: true });
    });
  }

  private static async pasteViaTauriPlugin(): Promise<File | null> {
    if (!(window as any).__TAURI__) return null;

    try {
      const base64 = await invoke<string>('read_clipboard_image');
      if (!base64) return null;

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      return new File([blob], 'pasted-image.png', { type: 'image/png' });
    } catch {
      return null;
    }
  }
}
