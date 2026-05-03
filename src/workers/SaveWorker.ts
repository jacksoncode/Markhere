type SaveCallback = () => Promise<void>;

export class SaveWorker {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private isSaving: boolean = false;

  constructor(delay: number = 500) {
    this.delay = delay;
  }

  triggerSave(callback: SaveCallback): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(async () => {
      if (this.isSaving) return;
      
      this.isSaving = true;
      try {
        await callback();
      } finally {
        this.isSaving = false;
        this.timer = null;
      }
    }, this.delay);
  }

  immediateSave(callback: SaveCallback): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    return callback();
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getIsSaving(): boolean {
    return this.isSaving;
  }
}

export const saveWorker = new SaveWorker(500);