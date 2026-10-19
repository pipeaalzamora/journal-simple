import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';
import { JournalImage } from '../types/journal';

interface LightboxModalProps {
  images: JournalImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onUpdateCaption: (imageId: string, newCaption: string) => void;
  onDeleteImage: (imageId: string) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onUpdateCaption,
  onDeleteImage,
}) => {
  const [isGrayscale, setIsGrayscale] = useState<boolean>(true);
  const [isEditingCaption, setIsEditingCaption] = useState<boolean>(false);
  const [captionInput, setCaptionInput] = useState<string>('');

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (currentImage) {
      setCaptionInput(currentImage.caption || '');
      setIsEditingCaption(false);
    }
  }, [currentIndex, currentImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1)
        onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !currentImage) return null;

  const handleSaveCaption = () => {
    onUpdateCaption(currentImage.id, captionInput);
    setIsEditingCaption(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.dataUrl;
    link.download = `tinta-journal-${currentImage.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between text-neutral-300">
        <div className="text-xs font-mono-journal text-neutral-400">
          Imagen {currentIndex + 1} de {images.length}
        </div>

        <div className="flex items-center gap-2">
          {/* Grayscale vs Color filter switch */}
          <button
            onClick={() => setIsGrayscale(!isGrayscale)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-journal rounded border transition-colors ${
              isGrayscale
                ? 'border-white text-white bg-white/10'
                : 'border-neutral-600 text-neutral-400 hover:text-white'
            }`}
            title="Alternar filtro Blanco y Negro"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isGrayscale ? 'Filtro B&N: Sí' : 'Original: Color'}</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Descargar imagen"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (window.confirm('¿Deseas eliminar esta imagen de la entrada?')) {
                onDeleteImage(currentImage.id);
                if (images.length <= 1) {
                  onClose();
                } else if (currentIndex >= images.length - 1) {
                  onNavigate(Math.max(0, currentIndex - 1));
                }
              }
            }}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Eliminar imagen"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
        {/* Previous navigation */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={currentImage.dataUrl}
          alt={currentImage.caption || 'Foto en diario'}
          className={`max-h-[75vh] max-w-[90vw] object-contain rounded select-none shadow-2xl transition-all duration-300 ${
            isGrayscale ? 'grayscale contrast-110' : ''
          }`}
        />

        {/* Next navigation */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-neutral-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Caption Area */}
      <div className="max-w-2xl mx-auto w-full text-center">
        {isEditingCaption ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Escribe un pie de foto o nota..."
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCaption();
                if (e.key === 'Escape') setIsEditingCaption(false);
              }}
            />
            <button
              onClick={handleSaveCaption}
              className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium hover:bg-neutral-200"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsEditingCaption(false)}
              className="px-2 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingCaption(true)}
            className="cursor-pointer group inline-flex items-center gap-1.5 text-xs font-serif-journal italic text-neutral-300 hover:text-white px-3 py-1 rounded hover:bg-white/5 transition-colors"
          >
            <span>{currentImage.caption || 'Haz clic para añadir un pie de foto...'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
