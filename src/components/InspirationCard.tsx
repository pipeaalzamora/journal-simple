import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, ArrowRight, Quote, Compass } from 'lucide-react';
import { getDailyInspiration, DailyInspiration } from '../lib/inspirationService';

interface InspirationCardProps {
  onApplyInspiration: (insp: DailyInspiration) => void;
  onClose: () => void;
  currentMood?: string;
}

const CATEGORIES = [
  'Aleatorio',
  'Introspección',
  'Gratitud',
  'Memoria',
  'El día de hoy',
  'Preguntas difíciles',
];

export const InspirationCard: React.FC<InspirationCardProps> = ({
  onApplyInspiration,
  onClose,
  currentMood,
}) => {
  const [inspiration, setInspiration] = useState<DailyInspiration | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Aleatorio');

  const fetchPrompt = async (category = selectedCategory) => {
    setLoading(true);
    try {
      const data = await getDailyInspiration(category, currentMood);
      setInspiration(data);
    } catch (err) {
      console.warn('Error fetching inspiration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompt(selectedCategory);
  }, [selectedCategory, currentMood]);

  return (
    <div className="relative mb-6 p-5 sm:p-6 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60 backdrop-blur-sm transition-all duration-300 shadow-sm animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-black text-white dark:bg-white dark:text-black">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-mono-journal font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
            Inspiración Diaria · Gemini
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchPrompt(selectedCategory)}
            disabled={loading}
            title="Generar nueva sugerencia"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono-journal text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Otra chispa</span>
          </button>

          <button
            onClick={onClose}
            title="Cerrar inspiración y escribir en blanco"
            className="p-1 rounded text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-neutral-200/60 dark:border-neutral-800/60">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-0.5 text-[11px] font-sans-ui rounded-full transition-colors shrink-0 ${
              selectedCategory === cat
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Inspiration Content */}
      <div className="pt-4 pb-2">
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 animate-ping mb-3" />
            <p className="font-serif-journal italic text-xs text-neutral-500 dark:text-neutral-400">
              Consultando la musa reflexiva con Gemini...
            </p>
          </div>
        ) : inspiration ? (
          <div>
            {/* Theme Label */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono-journal uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {inspiration.theme}
              </span>
              {inspiration.suggestedTag && (
                <span className="text-[10px] font-mono-journal text-neutral-400">
                  #{inspiration.suggestedTag}
                </span>
              )}
            </div>

            {/* Prompt Question */}
            <p className="font-serif-journal text-base sm:text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 mb-3 italic">
              "{inspiration.prompt}"
            </p>

            {/* Quote / Aphorism */}
            {inspiration.quote && (
              <p className="font-serif-journal text-xs text-neutral-500 dark:text-neutral-400 mb-4 pl-3 border-l-2 border-neutral-300 dark:border-neutral-700">
                {inspiration.quote}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-[11px] font-mono-journal text-neutral-400 hidden sm:block">
                Título sugerido: <span className="font-medium text-neutral-700 dark:text-neutral-300">{inspiration.suggestedTitle}</span>
              </div>

              <button
                onClick={() => onApplyInspiration(inspiration)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans-ui font-medium rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm ml-auto"
              >
                <span>Usar como punto de partida</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
