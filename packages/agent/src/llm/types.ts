export interface LLMToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type LLMChunk =
  | { type: 'text.delta'; delta: string }
  | { type: 'tool_call'; toolCall: LLMToolCall }
  | {
      type: 'done';
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };

export interface LLMAdapterOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  signal?: AbortSignal;
}

export interface LLMAdapter {
  chat(options: LLMAdapterOptions): AsyncIterable<LLMChunk>;
}
