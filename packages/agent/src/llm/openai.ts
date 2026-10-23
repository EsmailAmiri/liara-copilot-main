import OpenAI from 'openai';
import type { LLMAdapter, LLMAdapterOptions, LLMChunk, LLMToolCall } from './types.js';

export interface OpenAIAdapterConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  nativeTools?: boolean;
}

export class OpenAILLMAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;
  private nativeTools: boolean;

  constructor(config: OpenAIAdapterConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.LLM_API_KEY || 'fake-key',
      baseURL: config.baseURL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    });
    this.model = config.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.nativeTools = config.nativeTools ?? process.env.LLM_NATIVE_TOOLS !== '0';
  }

  async *chat(options: LLMAdapterOptions): AsyncIterable<LLMChunk> {
    if (this.nativeTools) {
      yield* this.chatNative(options);
    } else {
      yield* this.chatJsonFallback(options);
    }
  }

  private async *chatNative(options: LLMAdapterOptions): AsyncIterable<LLMChunk> {
    const tools = options.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const messages = options.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content || '',
          tool_call_id: m.tool_call_id || '',
        };
      }
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          })),
        };
      }
      return {
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content || '',
      };
    });

    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        stream: true,
      },
      { signal: options.signal },
    );

    const toolCallsAcc: Record<number, { id: string; name: string; argsStr: string }> = {};

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      if (choice.delta?.content) {
        yield { type: 'text.delta', delta: choice.delta.content };
      }

      if (choice.delta?.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          const index = tc.index ?? 0;
          if (!toolCallsAcc[index]) {
            toolCallsAcc[index] = {
              id: tc.id || `tc_${Date.now()}_${index}`,
              name: tc.function?.name || '',
              argsStr: '',
            };
          }
          if (tc.function?.name) {
            toolCallsAcc[index].name = tc.function.name;
          }
          if (tc.function?.arguments) {
            toolCallsAcc[index].argsStr += tc.function.arguments;
          }
        }
      }
    }

    // Emit accumulated tool calls
    for (const item of Object.values(toolCallsAcc)) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(item.argsStr || '{}');
      } catch {
        parsedArgs = { raw: item.argsStr };
      }
      yield {
        type: 'tool_call',
        toolCall: {
          id: item.id,
          name: item.name,
          args: parsedArgs,
        },
      };
    }

    yield { type: 'done' };
  }

  private async *chatJsonFallback(options: LLMAdapterOptions): AsyncIterable<LLMChunk> {
    const systemPromptAddition = `
To call a tool, respond with ONLY a single JSON code block in this exact format:
\`\`\`json
{
  "tool": "tool_name",
  "args": { ... }
}
\`\`\`
If no tool call is needed, reply normally with natural language.
`;

    const messages = options.messages.map((m) => ({
      role: m.role === 'tool' ? ('user' as const) : (m.role as 'system' | 'user' | 'assistant'),
      content: m.role === 'tool' ? `[Tool Result ${m.name || ''}]: ${m.content}` : m.content || '',
    }));

    if (messages[0] && messages[0].role === 'system') {
      messages[0].content += '\n' + systemPromptAddition;
    } else {
      messages.unshift({ role: 'system', content: systemPromptAddition });
    }

    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages,
        stream: true,
      },
      { signal: options.signal },
    );

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullText += text;
        yield { type: 'text.delta', delta: text };
      }
    }

    // Parse JSON block if present
    const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.tool && typeof parsed.tool === 'string') {
          const toolCall: LLMToolCall = {
            id: `call_${Date.now()}`,
            name: parsed.tool,
            args: parsed.args || {},
          };
          yield { type: 'tool_call', toolCall };
        }
      } catch {
        // Not a valid JSON tool call
      }
    }

    yield { type: 'done' };
  }
}
