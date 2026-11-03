import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Headphones, CloudRain, Coffee, Wind, ChevronDown } from 'lucide-react';
import { ambientSound, AmbientSoundType } from '../lib/ambientSound';

interface AmbientSoundControlProps {
  compact?: boolean;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({ compact = false }) => {
  const [currentType, setCurrentType] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState<number>(0.35);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentType(ambientSound.getCurrentType());
    setVolume(ambientSound.getVolume());
  }, []);

  const handleSelectSound = (type: AmbientSoundType) => {
    if (type === currentType) {
      ambientSound.stop();
      setCurrentType('none');
    } else {
      ambientSound.play(type);
      setCurrentType(type);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    ambientSound.setVolume(val);
  };

  const isPlaying = currentType !== 'none';

  const soundOptions = [
    { type: 'rain' as const, label: 'Lluvia serena', icon: CloudRain, desc: 'Llovizna suave continua' },
    { type: 'coffee' as const, label: 'Cafetería / Murmullo', icon: Coffee, desc: 'Ambiente cálido de fondo' },
    { type: 'whitenoise' as const, label: 'Brisa suave', icon: Wind, desc: 'Ruido envolvente relajante' },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-journal rounded border transition-colors ${
          isPlaying
            ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium shadow-sm'
            : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-800 dark:hover:border-neutral-200 bg-transparent'
        }`}
        title="Ambiente sonoro para concentración (lluvia, café, brisa)"
      >
        <Headphones className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
        {!compact && (
          <span className="hidden sm:inline">
            {isPlaying
              ? soundOptions.find((o) => o.type === currentType)?.label || 'Sonido activo'
              : 'Ambiente'}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-1.5 w-64 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-40 animate-fadeIn font-sans-ui text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-2">
              <span className="font-serif-journal font-semibold text-neutral-900 dark:text-neutral-100">
                Paisaje Sonoro
              </span>
              {isPlaying && (
                <button
                  onClick={() => {
                    ambientSound.stop();
                    setCurrentType('none');
                  }}
                  className="text-[10px] font-mono-journal text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  Silenciar
                </button>
              )}
            </div>

            {/* Sound Types */}
            <div className="space-y-1 mb-3">
              {soundOptions.map(({ type, label, icon: Icon, desc }) => {
                const active = currentType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectSound(type)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="leading-tight">{label}</div>
                        <div className="text-[10px] font-mono-journal text-neutral-400 dark:text-neutral-500">
                          {desc}
                        </div>
                      </div>
                    </div>
                    {active && <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />}
                  </button>
                );
              })}
            </div>

            {/* Volume Slider */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between text-[11px] font-mono-journal text-neutral-500 dark:text-neutral-400 mb-1.5">
                <span className="flex items-center gap-1">
                  {volume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  Volumen
                </span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full accent-black dark:accent-white cursor-pointer h-1 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
