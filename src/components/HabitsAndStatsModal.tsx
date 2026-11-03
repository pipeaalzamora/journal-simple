import React, { useState } from 'react';
import { X, Calendar, Flame, Award, BookOpen, Smile, Filter, TrendingUp } from 'lucide-react';
import { JournalEntry } from '../types/journal';
import {
  generateAnnualHeatmap,
  calculateStreak,
  calculateMoodDistribution,
  DayHeatmapData,
} from '../lib/journalStats';

interface HabitsAndStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onSelectMoodFilter?: (mood: string | null) => void;
}

export const HabitsAndStatsModal: React.FC<HabitsAndStatsModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectMoodFilter,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayHeatmapData | null>(null);

  if (!isOpen) return null;

  const { days, totalWordsYear, totalEntriesYear } = generateAnnualHeatmap(entries);
  const { currentStreak, longestStreak, totalDaysWritten } = calculateStreak(entries);
  const { items: moodItems, topMood, totalTagged } = calculateMoodDistribution(entries);

  // Group days into 7-day columns (weeks)
  const weeks: DayHeatmapData[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-serif-journal text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Hábitos, Ritmo y Memoria
              </h2>
              <p className="font-mono-journal text-[11px] text-neutral-500 dark:text-neutral-400">
                Constancia y evolución emocional a lo largo del año
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          {/* Current Streak */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60">
            <div className="flex items-center gap-1.5 text-xs font-mono-journal text-neutral-500 dark:text-neutral-400 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Racha actual</span>
            </div>
            <div className="font-serif-journal text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
            </div>
            <div className="text-[10px] font-mono-journal text-neutral-400 mt-0.5">
              {currentStreak > 0 ? '¡Hábito activo!' : 'Escribe hoy para comenzar'}
            </div>
          </div>

          {/* Longest Streak */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60">
            <div className="flex items-center gap-1.5 text-xs font-mono-journal text-neutral-500 dark:text-neutral-400 mb-1">
              <Award className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
              <span>Racha récord</span>
            </div>
            <div className="font-serif-journal text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {longestStreak} {longestStreak === 1 ? 'día' : 'días'}
            </div>
            <div className="text-[10px] font-mono-journal text-neutral-400 mt-0.5">
              Máximo consecutivo
            </div>
          </div>

          {/* Total Words */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60">
            <div className="flex items-center gap-1.5 text-xs font-mono-journal text-neutral-500 dark:text-neutral-400 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
              <span>Palabras año</span>
            </div>
            <div className="font-serif-journal text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalWordsYear.toLocaleString('es-ES')}
            </div>
            <div className="text-[10px] font-mono-journal text-neutral-400 mt-0.5">
              En {totalEntriesYear} pensamientos
            </div>
          </div>

          {/* Days Written */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60">
            <div className="flex items-center gap-1.5 text-xs font-mono-journal text-neutral-500 dark:text-neutral-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
              <span>Días escritos</span>
            </div>
            <div className="font-serif-journal text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalDaysWritten}
            </div>
            <div className="text-[10px] font-mono-journal text-neutral-400 mt-0.5">
              Días con reflexiones
            </div>
          </div>
        </div>

        {/* Section 1: Annual Monochromatic Heatmap */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Mapa de calor de pensamientos (últimas 52 semanas)
            </span>
            <div className="flex items-center gap-1 text-[10px] font-mono-journal text-neutral-400">
              <span>Menos</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 inline-block" />
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-400 dark:bg-neutral-600 inline-block" />
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700 dark:bg-neutral-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-950 dark:bg-white inline-block" />
              <span>Más</span>
            </div>
          </div>

          {/* Grid Container */}
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-1">
              {/* Day column indicators */}
              <div className="flex flex-col gap-1 pr-1 text-[9px] font-mono-journal text-neutral-400 justify-around select-none">
                <span>D</span>
                <span>M</span>
                <span>V</span>
              </div>

              {/* Weeks */}
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day) => {
                    let bg = 'bg-neutral-200/60 dark:bg-neutral-800/60';
                    if (day.level === 1) bg = 'bg-neutral-400 dark:bg-neutral-600';
                    if (day.level === 2) bg = 'bg-neutral-700 dark:bg-neutral-300';
                    if (day.level === 3) bg = 'bg-black dark:bg-white';

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-2.5 h-2.5 rounded-[2px] transition-transform hover:scale-125 cursor-pointer ${bg}`}
                        title={`${day.date}: ${day.count} ${day.count === 1 ? 'pensamiento' : 'pensamientos'} (${day.words} palabras)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Hover Day Detail Bar */}
          <div className="mt-2 text-[11px] font-mono-journal text-neutral-500 dark:text-neutral-400 min-h-[18px]">
            {hoveredDay ? (
              <span>
                <strong className="text-black dark:text-white">{hoveredDay.date}</strong>: {hoveredDay.count}{' '}
                {hoveredDay.count === 1 ? 'pensamiento' : 'pensamientos'} · {hoveredDay.words} palabras
              </span>
            ) : (
              <span>Pasa el cursor sobre un día para ver los detalles.</span>
            )}
          </div>
        </div>

        {/* Section 2: Mood Distribution & Evolution */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Evolución y Balance de Estados de Ánimo
              </span>
            </div>
            {topMood && (
              <span className="text-[11px] font-mono-journal text-neutral-500 dark:text-neutral-400">
                Predominante: <strong className="text-black dark:text-white">{topMood}</strong>
              </span>
            )}
          </div>

          {totalTagged === 0 ? (
            <p className="font-sans-ui text-xs text-neutral-400 dark:text-neutral-500 py-4 text-center">
              Aún no has registrado estados de ánimo en tus pensamientos. Selecciona tu estado en el menú superior al escribir para ver tu balance emocional aquí.
            </p>
          ) : (
            <div className="space-y-2.5">
              {moodItems.map((item) => (
                <div key={item.mood} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-sans-ui">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {item.mood}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono-journal text-neutral-400">
                      <span>{item.count} {item.count === 1 ? 'vez' : 'veces'}</span>
                      <span>({item.percentage}%)</span>
                      {onSelectMoodFilter && (
                        <button
                          onClick={() => {
                            onSelectMoodFilter(item.mood);
                            onClose();
                          }}
                          className="hover:text-black dark:hover:text-white underline underline-offset-2 ml-1"
                          title="Filtrar entradas con este ánimo"
                        >
                          ver
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-sans-ui font-medium rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
