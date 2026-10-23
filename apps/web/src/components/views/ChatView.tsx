'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ApprovalCardComponent } from '@/components/cards/ApprovalCard';
import { DiagnosisCardComponent } from '@/components/cards/DiagnosisCard';
import { VerificationCardComponent } from '@/components/cards/VerificationCard';
import { LimitationCardComponent } from '@/components/cards/LimitationCard';
import { useI18n } from '@/i18n/context';
import { useChat } from '@/context/ChatContext';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { Send, Sparkles, Bot, User, Paperclip, FileText, X } from 'lucide-react';

export function ChatView() {
  const { t } = useI18n();
  const { messages, isStreaming, sendMessage, handleApprovalResolved } = useChat();

  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isStreaming) return;
    setInputText('');
    setAttachedFile(null);
    sendMessage(text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    if (!inputText.trim()) {
      setInputText(`بررسی و تحلیل ساختار پروژه پیوست‌شده (${file.name})`);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{t.tagline}</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                یکی از پیشنهادات زیر را انتخاب کنید یا پیام خود را بنویسید:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {t.suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.prompt)}
                  className="p-3 text-start rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs transition group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block group-hover:text-blue-600 transition">
                    {p.title}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-1 line-clamp-2">
                    {p.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 max-w-3xl ${
                  isUser ? 'ms-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-te-none'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs rounded-ts-none'
                    }`}
                  >
                    {m.content ? (
                      isUser ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        <MarkdownRenderer content={m.content} />
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>{t.actions.analyzing}</span>
                      </div>
                    )}
                  </div>

                  {/* Rich Cards */}
                  {m.diagnosis && (
                    <DiagnosisCardComponent
                      appName={m.diagnosis.appName}
                      hypotheses={m.diagnosis.hypotheses}
                    />
                  )}

                  {m.approvalCard && (
                    <ApprovalCardComponent
                      actionId={m.approvalCard.actionId}
                      card={m.approvalCard.card}
                      expiresAt={m.approvalCard.expiresAt}
                      onResolved={handleApprovalResolved}
                    />
                  )}

                  {m.verification && (
                    <VerificationCardComponent
                      appName={m.verification.appName}
                      result={m.verification.result}
                    />
                  )}

                  {m.limitation && (
                    <LimitationCardComponent
                      message={m.limitation.message}
                      hint={m.limitation.hint}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input box */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 md:p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto"
        >
          {/* File Attachment Chip */}
          {attachedFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs w-fit border border-blue-200 dark:border-blue-800 shadow-2xs">
              <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-mono truncate max-w-xs">{attachedFile.name}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                ({(attachedFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition"
                title="حذف پیوست"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".zip,.tar.gz,.json,.yml,.yaml,.txt,Dockerfile"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center h-10 w-10 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              title={t.actions.uploadProject}
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.actions.inputPlaceholder}
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-4 py-2.5 text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition shadow-xs cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
