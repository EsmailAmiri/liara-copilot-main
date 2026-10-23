import type { ServerEvent } from '@copilot/shared';
import { ServerEventSchema } from '@copilot/shared';

export interface StreamChatOptions {
  conversationId: string;
  message: string;
  onEvent: (event: ServerEvent) => void;
  signal?: AbortSignal;
}

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)copilot_csrf=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const csrfToken = getCsrfToken();
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      conversationId: options.conversationId,
      message: options.message,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    const errText = await response.text();
    options.onEvent({
      type: 'error',
      code: `HTTP_${response.status}`,
      message: errText || 'خطا در ارتباط با سرور چت',
    });
    return;
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const blockLines = block.split('\n');
        let dataStr = '';

        for (const line of blockLines) {
          if (line.startsWith('data: ')) {
            dataStr = line.slice(6);
          }
        }

        if (dataStr) {
          try {
            const rawJson = JSON.parse(dataStr);
            const parsed = ServerEventSchema.safeParse(rawJson);
            if (parsed.success) {
              options.onEvent(parsed.data);
            }
          } catch {
            // Ignore non-json lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
