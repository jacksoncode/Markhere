export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyPrefix: string;
  models: AIModel[];
  features: {
    streaming: boolean;
    tools: boolean;
    vision: boolean;
  };
}

export interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  pricing: {
    input: number;
    output: number;
  };
  capabilities: string[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', maxTokens: 4096, pricing: { input: 0.001, output: 0.002 }, capabilities: ['chat', 'streaming'] },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', maxTokens: 4096, pricing: { input: 0.001, output: 0.002 }, capabilities: ['chat', 'code', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'zhipu',
    name: '智谱AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyPrefix: '',
    models: [
      { id: 'glm-4', name: 'GLM-4', maxTokens: 128000, pricing: { input: 0.1, output: 0.1 }, capabilities: ['chat', 'streaming', 'tools'] },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', maxTokens: 4096, pricing: { input: 0.001, output: 0.001 }, capabilities: ['chat', 'streaming'] },
      { id: 'glm-3-turbo', name: 'GLM-3 Turbo', maxTokens: 4096, pricing: { input: 0.001, output: 0.001 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'moonshot-v1-8k', name: 'Kimi 8K', maxTokens: 8192, pricing: { input: 0.012, output: 0.012 }, capabilities: ['chat', 'streaming'] },
      { id: 'moonshot-v1-32k', name: 'Kimi 32K', maxTokens: 32768, pricing: { input: 0.024, output: 0.024 }, capabilities: ['chat', 'streaming'] },
      { id: 'moonshot-v1-128k', name: 'Kimi 128K', maxTokens: 131072, pricing: { input: 0.06, output: 0.06 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'qwen-turbo', name: 'Qwen Turbo', maxTokens: 8192, pricing: { input: 0.002, output: 0.006 }, capabilities: ['chat', 'streaming'] },
      { id: 'qwen-plus', name: 'Qwen Plus', maxTokens: 32768, pricing: { input: 0.004, output: 0.012 }, capabilities: ['chat', 'streaming', 'tools'] },
      { id: 'qwen-max', name: 'Qwen Max', maxTokens: 32768, pricing: { input: 0.04, output: 0.12 }, capabilities: ['chat', 'streaming', 'tools'] },
      { id: 'qwen-long', name: 'Qwen Long', maxTokens: 10000, pricing: { input: 0.0005, output: 0.002 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'abab5.5-chat', name: 'ABAB 5.5 Chat', maxTokens: 8192, pricing: { input: 0.015, output: 0.015 }, capabilities: ['chat', 'streaming'] },
      { id: 'abab6.5-chat', name: 'ABAB 6.5 Chat', maxTokens: 16384, pricing: { input: 0.03, output: 0.03 }, capabilities: ['chat', 'streaming', 'tools'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'stepfun',
    name: '阶跃星辰',
    baseUrl: 'https://api.stepfun.com/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'step-1-8k', name: 'Step 1 8K', maxTokens: 8192, pricing: { input: 0.005, output: 0.02 }, capabilities: ['chat', 'streaming'] },
      { id: 'step-1-32k', name: 'Step 1 32K', maxTokens: 32768, pricing: { input: 0.015, output: 0.07 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'spark',
    name: '讯飞星火',
    baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'generalv3.5', name: '星火 V3.5', maxTokens: 8192, pricing: { input: 0.0036, output: 0.0036 }, capabilities: ['chat', 'streaming'] },
      { id: 'generalv4', name: '星火 V4', maxTokens: 8192, pricing: { input: 0.02, output: 0.02 }, capabilities: ['chat', 'streaming', 'tools'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'baichuan',
    name: '百川智能',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'Baichuan2-Turbo', name: 'Baichuan2 Turbo', maxTokens: 4096, pricing: { input: 0.008, output: 0.008 }, capabilities: ['chat', 'streaming'] },
      { id: 'Baichuan3-Turbo', name: 'Baichuan3 Turbo', maxTokens: 4096, pricing: { input: 0.012, output: 0.012 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B', maxTokens: 8192, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', maxTokens: 32768, pricing: { input: 0.002, output: 0.002 }, capabilities: ['chat', 'streaming'] },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek V2.5', maxTokens: 8192, pricing: { input: 0.0014, output: 0.0014 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'bailian',
    name: '阿里云百炼',
    baseUrl: 'https://bailian.aliyuncs.com/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'qwen-plus', name: '百炼 Qwen Plus', maxTokens: 32768, pricing: { input: 0.004, output: 0.012 }, capabilities: ['chat', 'streaming', 'tools'] },
      { id: 'qwen-max', name: '百炼 Qwen Max', maxTokens: 32768, pricing: { input: 0.04, output: 0.12 }, capabilities: ['chat', 'streaming', 'tools'] },
    ],
    features: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'volcengine',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyPrefix: '',
    models: [
      { id: 'doubao-pro-4k', name: '豆包 Pro 4K', maxTokens: 4096, pricing: { input: 0.0008, output: 0.002 }, capabilities: ['chat', 'streaming'] },
      { id: 'doubao-pro-32k', name: '豆包 Pro 32K', maxTokens: 32768, pricing: { input: 0.0005, output: 0.001 }, capabilities: ['chat', 'streaming'] },
      { id: 'doubao-pro-128k', name: '豆包 Pro 128K', maxTokens: 131072, pricing: { input: 0.005, output: 0.009 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'tencent',
    name: '腾讯云',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'hunyuan-lite', name: '混元 Lite', maxTokens: 4096, pricing: { input: 0.015, output: 0.015 }, capabilities: ['chat', 'streaming'] },
      { id: 'hunyuan-standard', name: '混元 Standard', maxTokens: 4096, pricing: { input: 0.018, output: 0.018 }, capabilities: ['chat', 'streaming'] },
      { id: 'hunyuan-pro', name: '混元 Pro', maxTokens: 4096, pricing: { input: 0.1, output: 0.1 }, capabilities: ['chat', 'streaming', 'tools'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'llama3.1', name: 'Llama 3.1', maxTokens: 131072, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
      { id: 'qwen2.5', name: 'Qwen 2.5', maxTokens: 32768, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
      { id: 'deepseek-r1', name: 'DeepSeek R1', maxTokens: 32768, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: true },
  },
  {
    id: 'ollama-ip',
    name: 'Ollama (远程IP)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'llama3.1', name: 'Llama 3.1', maxTokens: 131072, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
      { id: 'qwen2.5', name: 'Qwen 2.5', maxTokens: 32768, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
      { id: 'deepseek-r1', name: 'DeepSeek R1', maxTokens: 32768, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: true },
  },
  {
    id: 'vllm',
    name: 'vLLM',
    baseUrl: 'http://localhost:8000/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'default', name: 'vLLM Model', maxTokens: 32768, pricing: { input: 0, output: 0 }, capabilities: ['chat', 'streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  // ── International Providers ──
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000, pricing: { input: 0.0025, output: 0.01 }, capabilities: ['chat','streaming','tools','vision'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000, pricing: { input: 0.00015, output: 0.0006 }, capabilities: ['chat','streaming'] },
    ],
    features: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-4-opus', name: 'Claude 4 Opus', maxTokens: 200000, pricing: { input: 0.015, output: 0.075 }, capabilities: ['chat','streaming','tools','vision'] },
      { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', maxTokens: 200000, pricing: { input: 0.003, output: 0.015 }, capabilities: ['chat','streaming','tools','vision'] },
      { id: 'claude-4-haiku', name: 'Claude 4 Haiku', maxTokens: 200000, pricing: { input: 0.0008, output: 0.004 }, capabilities: ['chat','streaming'] },
    ],
    features: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: '',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxTokens: 1048576, pricing: { input: 0.00125, output: 0.01 }, capabilities: ['chat','streaming','tools','vision'] },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxTokens: 1048576, pricing: { input: 0.000075, output: 0.0003 }, capabilities: ['chat','streaming','tools'] },
    ],
    features: { streaming: true, tools: true, vision: true },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'mistral-large', name: 'Mistral Large', maxTokens: 128000, pricing: { input: 0.004, output: 0.012 }, capabilities: ['chat','streaming','tools'] },
      { id: 'mistral-small', name: 'Mistral Small', maxTokens: 32768, pricing: { input: 0.001, output: 0.003 }, capabilities: ['chat','streaming'] },
    ],
    features: { streaming: true, tools: true, vision: false },
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'grok-3', name: 'Grok 3', maxTokens: 131072, pricing: { input: 0.003, output: 0.015 }, capabilities: ['chat','streaming','tools'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
  {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    apiKeyPrefix: '',
    models: [
      { id: 'command-r-plus', name: 'Command R+', maxTokens: 128000, pricing: { input: 0.003, output: 0.015 }, capabilities: ['chat','streaming'] },
    ],
    features: { streaming: true, tools: false, vision: false },
  },
];

export async function fetchModelsFromProvider(providerId: string, apiKey: string): Promise<AIModel[]> {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return [];
  
  if (providerId === 'ollama') {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags');
      const data = await response.json();
      return data.models?.map((m: any) => ({
        id: m.name,
        name: m.name,
        maxTokens: 4096,
        pricing: { input: 0, output: 0 },
        capabilities: ['chat', 'streaming'],
      })) || [];
    } catch {
      return provider.models;
    }
  }
  
  try {
    const response = await fetch(`${provider.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data?.map((m: any) => ({
        id: m.id,
        name: m.id,
        maxTokens: m.max_tokens || 4096,
        pricing: { input: 0, output: 0 },
        capabilities: ['chat', 'streaming'],
      })) || provider.models;
    }
  } catch {
    console.log('Could not fetch models, using defaults');
  }
  
  return provider.models;
}