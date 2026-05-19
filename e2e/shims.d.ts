// Minimal type shims for @playwright/test
// These enable tsc --noEmit to check the e2e test files
// even when @playwright/test is not installed.

declare const process: {
  platform: string;
  env: Record<string, string | undefined>;
};

declare module '@playwright/test' {
  // Page
  interface Page {
    goto(url: string): Promise<void>;
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
    locator(selector: string): Locator;
    keyboard: Keyboard;
  }

  // Locator
  interface Locator {
    click(options?: { timeout?: number }): Promise<void>;
    fill(value: string): Promise<void>;
    type(text: string, options?: { delay?: number }): Promise<void>;
    press(key: string): Promise<void>;
    textContent(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
    evaluate<T>(pageFunction: string | ((el: HTMLElement) => T)): Promise<T>;
    isVisible(): Promise<boolean>;
    count(): Promise<number>;
    first(): Locator;
    filter(options: { hasText?: string | RegExp }): Locator;
    locator(selector: string): Locator;
  }

  // Keyboard
  interface Keyboard {
    type(text: string, options?: { delay?: number }): Promise<void>;
    press(key: string): Promise<void>;
  }

  // Expect
  interface Expect {
    (actual: unknown): Matchers;
    soft(actual: unknown): Matchers;
  }

  interface Matchers {
    toBeVisible(options?: { timeout?: number }): Promise<void>;
    not: Matchers;
    toContainText(expected: string): Promise<void>;
    toHaveClass(expected: RegExp | string): Promise<void>;
    toBe(expected: unknown): void;
    toBeTruthy(): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toMatch(matcher: string | RegExp): void;
  }

  // Test
  interface TestFn {
    (name: string, fn: (args: { page: Page }) => Promise<void>): void;
    describe: DescribeFn;
    beforeEach: HookFn;
  }

  interface DescribeFn {
    (name: string, fn: () => void): void;
  }

  interface HookFn {
    (fn: (args: { page: Page }) => Promise<void>): void;
  }

  export const test: TestFn;
  export const expect: Expect;
}
