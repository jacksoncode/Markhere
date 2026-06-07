import { useAIStore, callAI } from '../store/aiStore';

export interface AIResult { success: boolean; text: string; error?: string }

export class AIEnhanced {
  static async summarize(content: string): Promise<AIResult> {
    return this.run('你是一个专业的文档摘要助手。请用 3-5 句话概括以下文档的核心内容，仅输出摘要文本：', content);
  }

  static async translate(content: string, targetLang: string): Promise<AIResult> {
    const langMap: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español' };
    return this.run(`将以下文档翻译为${langMap[targetLang] || targetLang}。保持 Markdown 格式不变，只翻译文本内容：`, content);
  }

  static async polish(content: string, style: 'academic' | 'casual' | 'professional' = 'professional'): Promise<AIResult> {
    const prompts: Record<string, string> = { academic: '请以学术风格润色以下文档，使语言更正式严谨：', casual: '请以轻松随意的风格润色以下文档：', professional: '请以专业风格润色以下文档：' };
    return this.run(prompts[style], content);
  }

  static async suggestTags(content: string): Promise<AIResult> {
    return this.run(`分析以下文档内容，建议 5-8 个标签（逗号分隔）。仅输出标签列表：`, content.slice(0, 4000));
  }

  static async writingSuggestions(content: string): Promise<AIResult> {
    return this.run(`作为写作指导，分析以下文档并提供 3-5 条改进建议（结构/表达/逻辑）。以数字列表输出：`, content);
  }

  static async generateOutline(content: string): Promise<AIResult> {
    return this.run(`根据以下文档生成结构化大纲。使用缩进表示层级。仅输出大纲：`, content);
  }

  private static async run(instruction: string, content: string): Promise<AIResult> {
    try {
      const store = useAIStore.getState();
      const apiKey = store.getCurrentApiKey();
      if (!apiKey && store.config.providerId !== 'ollama') {
        return { success: false, text: '', error: '未配置 API Key。请在 AI 设置中添加 API Key。' };
      }
      const result = await callAI(`${instruction}\n\n${content.slice(0, 8000)}`, content, store.config, apiKey);
      return { success: true, text: result };
    } catch (e) {
      return { success: false, text: '', error: String(e) };
    }
  }
}
