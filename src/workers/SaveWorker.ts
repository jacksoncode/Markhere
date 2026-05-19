type SaveCallback = () => Promise<void>;
type AfterSaveCallback = (error?: Error) => void | Promise<void>;

export class SaveWorker {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private isSaving: boolean = false;
  private onAfterSave: AfterSaveCallback | null = null;

  constructor(delay: number = 500) {
    this.delay = delay;
  }

  /** Register a callback invoked after every save attempt (success or failure). */
  setOnAfterSave(callback: AfterSaveCallback | null): void {
    this.onAfterSave = callback;
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
        await this.onAfterSave?.();
      } catch (error) {
        await this.onAfterSave?.(error instanceof Error ? error : new Error(String(error)));
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