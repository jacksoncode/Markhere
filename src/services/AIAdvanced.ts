import { callAI } from '../store/aiStore';
import { useAIStore } from '../store/aiStore';

export interface AIAdvancedResult { success: boolean; text: string; error?: string }

export class AIAdvanced {

  /** 思维导图自动生成 */
  static async generateMindmap(content: string): Promise<AIAdvancedResult> {
    return execute('根据以下 Markdown 文档的标题层级结构，生成 Mermaid mindmap 代码。严格使用以下格式输出，不要加代码块标记：\nmindmap\n  root((文档主题))\n    一级主题1\n      二级主题1\n      二级主题2\n    一级主题2\n      二级主题3\n\n根据文档内容仅输出 mindmap 结构：', content);
  }

  /** 代码自动补全和优化 */
  static async optimizeCode(code: string, language: string): Promise<AIAdvancedResult> {
    return execute(`你是一个 ${language} 代码优化专家。分析以下代码并提供优化建议和改进后的代码。输出格式：\n## 分析\n（分析内容）\n## 优化后的代码\n（代码块）`, `\`\`\`${language}\n${code}\n\`\`\``);
  }

  /** 表格数据智能分析 */
  static async analyzeTable(markdown: string): Promise<AIAdvancedResult> {
    return execute(`分析以下 Markdown 表格的数据。提供：\n1. 数据概览（行数/列数/数据类型）\n2. 关键模式（趋势/异常值）\n3. 可视化建议\n\n仅输出分析结果：`, markdown);
  }

  /** 写作风格一致性检查 */
  static async checkStyleConsistency(content: string): Promise<AIAdvancedResult> {
    return execute(`作为风格检查专家，分析以下文档的写作风格一致性。检查：\n- 用词语气是否统一\n- 句式结构是否多样\n- 标点符号是否规范\n- 专业术语是否一致\n\n以清单格式输出发现：`, content.slice(0, 8000));
  }

  /** 生成目录 */
  static async generateTOC(content: string): Promise<AIAdvancedResult> {
    return execute('根据以下文档的标题层级生成完整目录（Markdown 格式），用缩进表示层级：', content.slice(0, 10000));
  }
}

async function execute(instruction: string, content: string): Promise<AIAdvancedResult> {
  try {
    const store = useAIStore.getState();
    const apiKey = store.getCurrentApiKey();
    if (!apiKey && store.config.providerId !== 'ollama') return { success: false, text: '', error: '未配置 API Key' };
    const result = await callAI(`${instruction}\n\n${content}`, '', store.config, apiKey);
    return { success: true, text: result };
  } catch (e) { return { success: false, text: '', error: String(e) }; }
}
