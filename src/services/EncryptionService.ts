export interface EncryptedNote {
  id: string;
  title: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EncryptionService {
  private algorithm = 'AES-GCM';
  private keyLength = 256;
  private ivLength = 12;
  private saltLength = 16;

  async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(content: string, password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const key = await this.generateKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv,
      },
      key,
      data
    );
    
    return {
      encrypted: this.arrayToHex(new Uint8Array(encrypted)),
      iv: this.arrayToHex(iv),
      salt: this.arrayToHex(salt),
    };
  }

  async decrypt(encryptedHex: string, ivHex: string, saltHex: string, password: string): Promise<string> {
    const encrypted = this.hexToArray(encryptedHex);
    const iv = this.hexToArray(ivHex);
    const salt = this.hexToArray(saltHex);
    
    const key = await this.generateKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: iv as BufferSource,
      },
      key,
      encrypted.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async createNote(title: string, content: string, password: string): Promise<EncryptedNote> {
    const { encrypted, iv, salt } = await this.encrypt(content, password);
    
    return {
      id: crypto.randomUUID(),
      title,
      encryptedContent: encrypted,
      iv,
      salt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async unlockNote(note: EncryptedNote, password: string): Promise<string> {
    return this.decrypt(note.encryptedContent, note.iv, note.salt, password);
  }

  async updateNote(note: EncryptedNote, content: string, password: string): Promise<EncryptedNote> {
    const { encrypted, iv, salt } = await this.encrypt(content, password);
    
    return {
      ...note,
      encryptedContent: encrypted,
      iv,
      salt,
      updatedAt: new Date(),
    };
  }

  saveNotes(notes: EncryptedNote[]): void {
    localStorage.setItem('encrypted-notes', JSON.stringify(notes));
  }

  loadNotes(): EncryptedNote[] {
    const data = localStorage.getItem('encrypted-notes');
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private arrayToHex(array: Uint8Array): string {
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToArray(hex: string): Uint8Array {
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return array;
  }
}