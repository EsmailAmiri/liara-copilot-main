import { EventEmitter } from 'node:events';
import type { ServerEvent } from '@copilot/shared';

export type EventCallback = (event: ServerEvent) => void;

export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  emitEvent(event: ServerEvent): void {
    if ('conversationId' in event && event.conversationId) {
      this.emitter.emit(`conv:${event.conversationId}`, event);
    }
    this.emitter.emit('all', event);
  }

  subscribeConversation(conversationId: string, callback: EventCallback): () => void {
    const channel = `conv:${conversationId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  subscribeAll(callback: EventCallback): () => void {
    this.emitter.on('all', callback);
    return () => {
      this.emitter.off('all', callback);
    };
  }
}

export const defaultEventBus = new EventBus();
