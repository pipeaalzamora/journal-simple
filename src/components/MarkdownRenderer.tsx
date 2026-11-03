import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onToggleTask?: (lineIndex: number, newChecked: boolean) => void;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onToggleTask,
  className = '',
}) => {
  if (!content || !content.trim()) {
    return (
      <p className="italic text-neutral-400 dark:text-neutral-500 font-serif-journal">
        Hoja en blanco. Comienza a escribir tus pensamientos...
      </p>
    );
  }

  const lines = content.split('\n');

  // Parse inline styles: bold, italic, inline code
  const renderInline = (text: string): React.ReactNode => {
    // Basic regex parser for **bold**, *italic*, and `code`
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Pattern: `code`, **bold**, *italic*
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono-journal text-xs border border-neutral-300 dark:border-neutral-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={key++} className="font-semibold text-black dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={key++} className="italic text-neutral-800 dark:text-neutral-200">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`space-y-3 font-serif-journal text-base sm:text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 select-text ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line spacer
        if (!trimmed) {
          return <div key={idx} className="h-3" />;
        }

        // Horizontal divider: --- or ***
        if (trimmed === '---' || trimmed === '***') {
          return (
            <hr
              key={idx}
              className="my-6 border-t border-neutral-200 dark:border-neutral-800"
            />
          );
        }

        // Interactive Checklist: - [ ] or - [x]
        const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
        if (taskMatch) {
          const isChecked = taskMatch[2].toLowerCase() === 'x';
          const taskText = taskMatch[3];

          return (
            <div
              key={idx}
              onClick={() => onToggleTask?.(idx, !isChecked)}
              className="flex items-start gap-2.5 my-1.5 cursor-pointer group select-none transition-colors"
            >
              <button
                type="button"
                className="mt-1 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0"
              >
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-black dark:text-white" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                )}
              </button>
              <span
                className={`flex-1 ${
                  isChecked
                    ? 'line-through text-neutral-400 dark:text-neutral-500'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {renderInline(taskText)}
              </span>
            </div>
          );
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="font-serif-journal text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mt-4 mb-1"
            >
              {renderInline(trimmed.substring(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="font-serif-journal text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-5 mb-2"
            >
              {renderInline(trimmed.substring(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="font-serif-journal text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-6 mb-2"
            >
              {renderInline(trimmed.substring(2))}
            </h1>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-neutral-800 dark:border-neutral-200 pl-4 py-1 my-2 italic text-neutral-700 dark:text-neutral-300 bg-neutral-50/60 dark:bg-neutral-900/40 rounded-r"
            >
              {renderInline(trimmed.substring(2))}
            </blockquote>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400 mt-2.5 shrink-0" />
              <span className="flex-1 text-neutral-800 dark:text-neutral-200">
                {renderInline(trimmed.substring(2))}
              </span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="my-1 text-neutral-800 dark:text-neutral-200">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};
