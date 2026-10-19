import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, ArrowRight, Tag } from 'lucide-react';
import { JournalEntry } from '../types/journal';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onSelectEntry: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = entries.filter((entry) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      entry.title?.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      entry.tags?.some((t) => t.toLowerCase().includes(q)) ||
      entry.date.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por palabra, frase, #etiqueta o fecha..."
            className="flex-1 text-sm font-sans-ui bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs font-sans-ui text-neutral-400">
              No se encontraron coincidencias para "{query}".
            </div>
          ) : (
            results.map((entry) => (
              <div
                key={entry.id}
                onClick={() => {
                  onSelectEntry(entry.id);
                  onClose();
                }}
                className="p-3 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 rounded-lg cursor-pointer transition-colors group flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono-journal text-neutral-400 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{entry.date}</span>
                    {entry.mood && (
                      <span className="border border-neutral-200 dark:border-neutral-700 px-1 rounded text-[10px] uppercase">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1">
                    {entry.title || entry.content.slice(0, 45) || 'Sin título'}
                  </h4>
                  <p className="font-serif-journal text-xs text-neutral-500 line-clamp-1">
                    {entry.content}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono-journal text-neutral-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <ArrowRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0 mt-2" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
