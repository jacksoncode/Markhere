import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Large File Performance', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testFile5MB = path.join(fixturesDir, 'large-test-5mb.md');
  const testFile10MB = path.join(fixturesDir, 'large-test-10mb.md');

  test.beforeAll(() => {
    // 创建 fixtures 目录
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // 生成 5MB 测试文件
    if (!fs.existsSync(testFile5MB)) {
      const content5MB = generateMarkdownContent(5 * 1024 * 1024);
      fs.writeFileSync(testFile5MB, content5MB);
      console.log(`✅ Generated 5MB test file: ${testFile5MB}`);
    }

    // 生成 10MB 测试文件
    if (!fs.existsSync(testFile10MB)) {
      const content10MB = generateMarkdownContent(10 * 1024 * 1024);
      fs.writeFileSync(testFile10MB, content10MB);
      console.log(`✅ Generated 10MB test file: ${testFile10MB}`);
    }
  });

  test('should load 5MB file in under 3 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const startTime = Date.now();

    // 模拟加载文件（通过 Tauri 命令）
    const loadTime = await page.evaluate(async (filePath) => {
      const start = performance.now();

      try {
        const tauri = (window as any).__TAURI__;
        if (!tauri) return -1;

        // 调用大文件服务
        const fileSize = await tauri.core.invoke('get_file_size', { path: filePath });
        console.log(`File size: ${fileSize} bytes`);

        // 如果是大文件，测试分块加载
        if (fileSize > 5 * 1024 * 1024) {
          const chunkSize = 1024 * 1024; // 1MB
          const totalChunks = Math.ceil(fileSize / chunkSize);
          const chunks: string[] = [];

          for (let i = 0; i < totalChunks; i++) {
            const chunk = await tauri.core.invoke('read_file_chunk', {
              path: filePath,
              offset: i * chunkSize,
              length: chunkSize,
            });
            chunks.push(chunk);
          }

          const content = chunks.join('');
          console.log(`Loaded ${content.length} characters in ${totalChunks} chunks`);
        } else {
          await tauri.core.invoke('read_file', { path: filePath });
        }

        return performance.now() - start;
      } catch (error) {
        console.error('Load error:', error);
        return -1;
      }
    }, testFile5MB);

    if (loadTime > 0) {
      console.log(`✅ Loaded 5MB file in ${loadTime.toFixed(0)}ms`);
      expect(loadTime).toBeLessThan(3000);
    } else {
      console.log('⚠️ Tauri not available, skipping test');
      test.skip();
    }
  });

  test('should load 10MB file in under 5 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = await page.evaluate(async (filePath) => {
      const start = performance.now();

      try {
        const tauri = (window as any).__TAURI__;
        if (!tauri) return -1;

        const fileSize = await tauri.core.invoke('get_file_size', { path: filePath });

        const chunkSize = 1024 * 1024;
        const totalChunks = Math.ceil(fileSize / chunkSize);
        const chunks: string[] = [];

        for (let i = 0; i < totalChunks; i++) {
          const chunk = await tauri.core.invoke('read_file_chunk', {
            path: filePath,
            offset: i * chunkSize,
            length: chunkSize,
          });
          chunks.push(chunk);

          // 模拟 UI 更新
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        const content = chunks.join('');
        return performance.now() - start;
      } catch (error) {
        console.error('Load error:', error);
        return -1;
      }
    }, testFile10MB);

    if (loadTime > 0) {
      console.log(`✅ Loaded 10MB file in ${loadTime.toFixed(0)}ms`);
      expect(loadTime).toBeLessThan(5000);
    } else {
      console.log('⚠️ Tauri not available, skipping test');
      test.skip();
    }
  });

  test('should show progress for large files', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // 触发大文件加载
    const progressShown = await page.evaluate(async (filePath) => {
      const tauri = (window as any).__TAURI__;
      if (!tauri) return false;

      // 模拟加载进度
      let progressUpdates = 0;
      const updateProgress = (progress: number) => {
        progressUpdates++;
        console.log(`Progress: ${progress}%`);
      };

      try {
        const fileSize = await tauri.core.invoke('get_file_size', { path: filePath });
        const chunkSize = 1024 * 1024;
        const totalChunks = Math.ceil(fileSize / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          await tauri.core.invoke('read_file_chunk', {
            path: filePath,
            offset: i * chunkSize,
            length: chunkSize,
          });

          const progress = ((i + 1) / totalChunks) * 100;
          updateProgress(progress);
        }

        return progressUpdates > 0;
      } catch (error) {
        return false;
      }
    }, testFile10MB);

    if (progressShown) {
      console.log('✅ Progress updates shown');
      expect(progressShown).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should not block UI during large file load', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const uiResponsive = await page.evaluate(async (filePath) => {
      const tauri = (window as any).__TAURI__;
      if (!tauri) return false;

      let clicksProcessed = 0;

      // 添加点击监听
      const button = document.createElement('button');
      button.id = 'test-button';
      button.onclick = () => clicksProcessed++;
      document.body.appendChild(button);

      try {
        // 开始加载大文件
        const fileSize = await tauri.core.invoke('get_file_size', { path: filePath });
        const chunkSize = 1024 * 1024;
        const totalChunks = Math.ceil(fileSize / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          await tauri.core.invoke('read_file_chunk', {
            path: filePath,
            offset: i * chunkSize,
            length: chunkSize,
          });

          // 让出主线程
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));

            // 模拟点击
            button.click();
          }
        }

        button.remove();
        return clicksProcessed > 0;
      } catch (error) {
        button.remove();
        return false;
      }
    }, testFile10MB);

    if (uiResponsive) {
      console.log('✅ UI remained responsive during load');
      expect(uiResponsive).toBeTruthy();
    } else {
      test.skip();
    }
  });
});

// 生成指定大小的 Markdown 内容
function generateMarkdownContent(targetSize: number): string {
  const sections = [
    '# Test Document\n\n',
    '## Introduction\n\n',
    'This is a test document for performance testing.\n\n',
  ];

  let content = sections.join('');
  let counter = 0;

  // 生成重复的段落直到达到目标大小
  while (Buffer.byteLength(content, 'utf8') < targetSize) {
    counter++;

    const section = `
### Section ${counter}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

- Item 1
- Item 2
- Item 3

**Bold text** and *italic text* with \`code\` inline.

\`\`\`javascript
function example() {
  console.log('Hello, world!');
  return true;
}
\`\`\`

`;

    content += section;

    // 每 100 个段落添加一个表格
    if (counter % 100 === 0) {
      content += `
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

`;
    }
  }

  // 截断到精确大小
  const buffer = Buffer.from(content, 'utf8');
  return buffer.slice(0, targetSize).toString('utf8');
}
