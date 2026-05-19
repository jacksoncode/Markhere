import { invoke } from '@tauri-apps/api/core';
import { useNotificationStore } from '../components/Notification/Notification';

/**
 * Safely invoke a Tauri IPC command with unified error handling.
 *
 * On error: shows a toast notification, logs to console, and re-throws
 * so callers can still react to the failure if needed.
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(`[IPC] Command "${command}" failed:`, error);

    try {
      const { notify } = useNotificationStore.getState();
      notify('error', message, `IPC Error: ${command}`);
    } catch {
      // Notification store may not be available
    }

    throw error;
  }
}

/**
 * Wrap an async function with unified error handling.
 *
 * On error: shows a toast notification (with optional context string),
 * logs to console, and re-throws.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    const label = context ? `Error (${context})` : 'Error';

    console.error(`[ErrorHandling] ${label}:`, error);

    try {
      const { notify } = useNotificationStore.getState();
      notify('error', message, label);
    } catch {
      // Notification store may not be available
    }

    throw error;
  }
}
