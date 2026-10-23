'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 dark:text-gray-100">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1.5 border-b border-gray-200 dark:border-gray-800 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2.5 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-2 mb-1">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-1.5 ps-2 text-gray-800 dark:text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-1.5 ps-2 text-gray-800 dark:text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-s-3 border-blue-500 ps-3 my-2 text-gray-600 dark:text-gray-400 italic bg-blue-50/30 dark:bg-blue-950/20 py-1 rounded-e">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className || '');
            if (isBlock) {
              return (
                <div className="my-2 rounded-xl bg-gray-900 dark:bg-black/60 p-3 text-gray-100 font-mono text-xs overflow-x-auto border border-gray-800">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </div>
              );
            }
            return (
              <code
                className="rounded bg-black/[0.06] dark:bg-white/[0.1] px-1.5 py-0.5 font-mono text-[0.88em] text-blue-700 dark:text-blue-300 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-xs text-start divide-y divide-gray-200 dark:divide-gray-800">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">{children}</tr>
          ),
          th: ({ children }) => <th className="p-2 text-start">{children}</th>,
          td: ({ children }) => <td className="p-2 text-start">{children}</td>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
