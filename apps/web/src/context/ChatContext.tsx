'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { TimelineStep, ApprovalCard, Hypothesis, VerificationResult } from '@copilot/shared';
import { streamChat } from '@/lib/sse';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  approvalCard?: { actionId: string; card: ApprovalCard; expiresAt: number };
  diagnosis?: { appName: string; hypotheses: Hypothesis[] };
  verification?: { appName: string; result: VerificationResult };
  limitation?: { message: string; hint?: string };
}

interface ChatContextType {
  conversationId: string;
  messages: ChatMessage[];
  timelineSteps: TimelineStep[];
  isStreaming: boolean;
  selectedApp: string;
  setSelectedApp: (app: string) => void;
  sendMessage: (text: string) => Promise<void>;
  handleApprovalResolved: (status: 'approved' | 'rejected') => void;
  newConversation: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversationId, setConversationId] = useState('conv_init');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>('demo-shop');

  useEffect(() => {
    setConversationId(`conv_${Date.now()}`);
  }, []);

  const newConversation = () => {
    setConversationId(`conv_${Date.now()}`);
    setMessages([]);
    setTimelineSteps([]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsgId = `usr_${Date.now()}`;
    const assistantMsgId = `ast_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);

    setIsStreaming(true);

    try {
      await streamChat({
        conversationId,
        message: text,
        onEvent: (event) => {
          switch (event.type) {
            case 'message.delta':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + event.delta } : m,
                ),
              );
              break;

            case 'timeline.step':
              setTimelineSteps((prev) => {
                const existing = prev.findIndex((s) => s.id === event.step.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = event.step;
                  return updated;
                }
                return [...prev, event.step];
              });
              break;

            case 'approval.required':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        approvalCard: {
                          actionId: event.actionId,
                          card: event.card,
                          expiresAt: event.expiresAt,
                        },
                      }
                    : m,
                ),
              );
              break;

            case 'diagnosis.ready':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        diagnosis: {
                          appName: event.appName,
                          hypotheses: event.hypotheses,
                        },
                      }
                    : m,
                ),
              );
              break;

            case 'verification.result':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        verification: {
                          appName: event.appName,
                          result: event.result,
                        },
                      }
                    : m,
                ),
              );
              break;

            case 'error':
              if (event.code === 'NOT_SUPPORTED_BY_API') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          limitation: {
                            message: event.message,
                            hint: event.hint,
                          },
                        }
                      : m,
                  ),
                );
              }
              break;
          }
        },
      });
    } catch (err: unknown) {
      console.error('Streaming error in ChatContext:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleApprovalResolved = (status: 'approved' | 'rejected') => {
    // Immediately transition any pending or running approval steps in the timeline to completed/cancelled
    setTimelineSteps((prev) =>
      prev.map((step) => {
        if (step.status === 'running' || step.status === 'pending') {
          return {
            ...step,
            status: status === 'approved' ? 'completed' : 'cancelled',
            title:
              status === 'approved'
                ? `تکمیل اجرای تأییدشده: ${step.tool}`
                : `لغو درخواست: ${step.tool}`,
          };
        }
        return step;
      }),
    );

    if (status === 'approved') {
      sendMessage('تأیید شد. لطفاً ادامه بده و وضعیت را اعتبارسنجی کن.');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversationId,
        messages,
        timelineSteps,
        isStreaming,
        selectedApp,
        setSelectedApp,
        sendMessage,
        handleApprovalResolved,
        newConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
