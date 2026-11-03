import React, { useState } from 'react';
import { History, ArrowRight, X } from 'lucide-react';
import { TimeCapsuleMemory } from '../lib/journalStats';

interface TimeCapsuleBannerProps {
  memories: TimeCapsuleMemory[];
  onOpenMemory: (entryId: string) => void;
}

export const TimeCapsuleBanner: React.FC<TimeCapsuleBannerProps> = ({
  memories,
  onOpenMemory,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !memories || memories.length === 0) return null;

  const currentMemory = memories[0];
  const title = currentMemory.entry.title || 'Pensamiento sin título';

  return (
    <div className="mb-5 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-900/60 backdrop-blur-sm flex items-center justify-between gap-3 text-xs font-sans-ui animate-fadeIn">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <span className="p-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shrink-0">
          <History className="w-3.5 h-3.5" />
        </span>
        <div className="truncate">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100 mr-1.5 font-serif-journal">
            En este día:
          </span>
          <span className="text-neutral-600 dark:text-neutral-400 font-serif-journal italic">
            {currentMemory.label} escribiste{' '}
            <strong className="text-neutral-900 dark:text-neutral-100 not-italic font-medium">
              «{title}»
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onOpenMemory(currentMemory.entry.id)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono-journal rounded border border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity"
        >
          <span>Leer</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
          title="Ocultar recordatorio"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
