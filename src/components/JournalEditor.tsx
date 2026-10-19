import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Pin,
  Trash2,
  Calendar,
  Tag,
  Smile,
  X,
  Plus,
  Maximize2,
  FileText,
  Printer,
  Share2,
  Check,
  Upload,
  Sparkles,
} from 'lucide-react';
import { JournalEntry, JournalImage } from '../types/journal';
import {
  processAndCompressImage,
  extractImagesFromClipboard,
  extractImagesFromDrop,
} from '../lib/imageUtils';
import { InspirationCard } from './InspirationCard';
import { DailyInspiration } from '../lib/inspirationService';

interface JournalEditorProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onOpenLightbox: (images: JournalImage[], index: number) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

const AVAILABLE_MOODS = [
  'Calmo',
  'Pensativo',
  'Inspirado',
  'Introspectivo',
  'Agradecido',
  'Enérgico',
  'Melancólico',
  'Desafiado',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onUpdateEntry,
  onDeleteEntry,
  onOpenLightbox,
  isFocusMode,
  onToggleFocusMode,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showInspiration, setShowInspiration] = useState<boolean>(!entry.content.trim());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When switching entries, suggest inspiration if the entry is blank
  useEffect(() => {
    if (!entry.content.trim()) {
      setShowInspiration(true);
    } else {
      setShowInspiration(false);
    }
  }, [entry.id]);

  // Auto-resize textarea to fit text naturally
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(
        240,
        textareaRef.current.scrollHeight
      )}px`;
    }
  }, [entry.content]);

  // Handle Clipboard Paste for images (e.g. Cmd+V a screenshot or copied photo)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const imageFiles = extractImagesFromClipboard(e);
      if (imageFiles.length > 0) {
        e.preventDefault();
        setIsProcessingImage(true);
        try {
          const newImages: JournalImage[] = [];
          for (const file of imageFiles) {
            const processed = await processAndCompressImage(file);
            newImages.push(processed);
          }
          onUpdateEntry({
            images: [...(entry.images || []), ...newImages],
          });
        } catch (err) {
          console.error('Error pasting image:', err);
        } finally {
          setIsProcessingImage(false);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [entry.images, onUpdateEntry]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = extractImagesFromDrop(e);
    if (files.length > 0) {
      setIsProcessingImage(true);
      try {
        const newImages: JournalImage[] = [];
        for (const file of files) {
          const processed = await processAndCompressImage(file);
          newImages.push(processed);
        }
        onUpdateEntry({
          images: [...(entry.images || []), ...newImages],
        });
      } catch (err) {
        console.error('Error processing dropped images:', err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsProcessingImage(true);
    try {
      const newImages: JournalImage[] = [];
      for (const file of files) {
        const processed = await processAndCompressImage(file);
        newImages.push(processed);
      }
      onUpdateEntry({
        images: [...(entry.images || []), ...newImages],
      });
    } catch (err) {
      console.error('Error uploading images:', err);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    const clean = newTagText.trim().replace(/^#/, '');
    if (!clean) return;
    const existing = entry.tags || [];
    if (!existing.includes(clean)) {
      onUpdateEntry({ tags: [...existing, clean] });
    }
    setNewTagText('');
    setShowTagInput(false);
  };

  const handleApplyInspiration = (insp: DailyInspiration) => {
    const updates: Partial<JournalEntry> = {};

    if (!entry.title?.trim() && insp.suggestedTitle) {
      updates.title = insp.suggestedTitle;
    }

    const leadText = `— ${insp.prompt}\n\n`;
    if (!entry.content.trim()) {
      updates.content = leadText;
    } else {
      updates.content = `${entry.content}\n\n${leadText}`;
    }

    if (insp.suggestedTag) {
      const cleanTag = insp.suggestedTag.replace(/^#/, '').trim();
      const currentTags = entry.tags || [];
      if (!currentTags.includes(cleanTag)) {
        updates.tags = [...currentTags, cleanTag];
      }
    }

    onUpdateEntry(updates);
    setShowInspiration(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 60);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateEntry({
      tags: (entry.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleRemoveImage = (imageId: string) => {
    onUpdateEntry({
      images: (entry.images || []).filter((img) => img.id !== imageId),
    });
  };

  const handleExportMarkdown = () => {
    const title = entry.title || 'Pensamiento';
    const md = `# ${title}
*Fecha: ${entry.date}*
${entry.mood ? `*Estado de ánimo: ${entry.mood}*` : ''}
${entry.tags && entry.tags.length > 0 ? `*Etiquetas: ${entry.tags.map((t) => `#${t}`).join(' ')}*` : ''}

${entry.content}

${
  entry.images && entry.images.length > 0
    ? `\n### Imágenes adjuntas (${entry.images.length})\n` +
      entry.images.map((img, i) => `![${img.caption || `Imagen ${i + 1}`}](${img.dataUrl})`).join('\n\n')
    : ''
}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entry.date}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    window.print();
  };

  // Word & Reading statistics
  const wordCount = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
  const charCount = entry.content.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const formatDisplayDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 flex flex-col h-full overflow-y-auto bg-white dark:bg-neutral-950 transition-colors ${
        isFocusMode ? 'px-4 sm:px-12 md:px-24 py-8' : 'px-4 sm:px-8 md:px-12 py-6'
      }`}
    >
      {/* Hidden File Input for Image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-4 z-30 rounded-xl border-2 border-dashed border-neutral-900 dark:border-neutral-100 bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none transition-all">
          <Upload className="w-10 h-10 text-neutral-800 dark:text-neutral-200 animate-bounce mb-3" />
          <p className="font-serif-journal text-lg text-neutral-900 dark:text-neutral-100 font-medium">
            Suelta tus fotos aquí
          </p>
          <p className="font-sans-ui text-xs text-neutral-500 mt-1">
            Se optimizarán automáticamente y se sincronizarán con este pensamiento.
          </p>
        </div>
      )}

      {/* Center Writing Container */}
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
        {/* Top Entry Metadata Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-6 gap-3">
          {/* Date Picker / Header */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={entry.date}
              onChange={(e) => onUpdateEntry({ date: e.target.value })}
              className="font-mono-journal text-xs bg-transparent text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            />
            <span className="hidden sm:inline text-xs font-serif-journal italic text-neutral-600 dark:text-neutral-400 capitalize">
              ({formatDisplayDate(entry.date)})
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* Mood selector button */}
            <div className="relative">
              <button
                onClick={() => setShowMoodMenu(!showMoodMenu)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono-journal rounded border transition-colors ${
                  entry.mood
                    ? 'border-neutral-800 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                title="Estado de ánimo o intención"
              >
                <Smile className="w-3.5 h-3.5" />
                <span>{entry.mood || 'Ánimo'}</span>
              </button>

              {showMoodMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-20">
                  <div className="px-2.5 py-1 text-[11px] font-mono-journal text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                    Selecciona tu estado:
                  </div>
                  {AVAILABLE_MOODS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => {
                        onUpdateEntry({ mood: entry.mood === mood ? undefined : mood });
                        setShowMoodMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-serif-journal hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between ${
                        entry.mood === mood ? 'font-semibold text-black dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span>{mood}</span>
                      {entry.mood === mood && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  {entry.mood && (
                    <button
                      onClick={() => {
                        onUpdateEntry({ mood: undefined });
                        setShowMoodMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-mono-journal text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-t border-neutral-100 dark:border-neutral-800"
                    >
                      Quitar estado
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pin Toggle */}
            <button
              onClick={() => onUpdateEntry({ pinned: !entry.pinned })}
              className={`p-1.5 rounded border transition-colors ${
                entry.pinned
                  ? 'border-neutral-800 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
              title={entry.pinned ? 'Desfijar' : 'Fijar pensamiento al inicio'}
            >
              <Pin className={`w-3.5 h-3.5 ${entry.pinned ? 'fill-current' : ''}`} />
            </button>

            {/* Inspiration Button */}
            <button
              onClick={() => setShowInspiration(!showInspiration)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono-journal rounded border transition-colors ${
                showInspiration
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                  : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-800 dark:hover:border-neutral-200'
              }`}
              title="Inspiración diaria con Gemini (sugerencias para escribir)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inspiración</span>
            </button>

            {/* Add Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono-journal rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-800 dark:hover:border-neutral-200 transition-colors"
              title="Insertar imagen (o arrastra y suelta / pega con Ctrl+V)"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Foto</span>
            </button>

            {/* Export Dropdown / Action */}
            <button
              onClick={handleExportMarkdown}
              className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Descargar como Markdown (.md)"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Imprimir o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* Delete Entry */}
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que deseas eliminar este pensamiento? Esta acción no se puede deshacer.')) {
                  onDeleteEntry(entry.id);
                }
              }}
              className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-400 transition-colors"
              title="Eliminar pensamiento"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={entry.title || ''}
          onChange={(e) => onUpdateEntry({ title: e.target.value })}
          placeholder="Título del pensamiento (opcional)..."
          className="w-full font-serif-journal text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700 bg-transparent focus:outline-none mb-4"
        />

        {/* Tags Section */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(entry.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono-journal rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 group"
            >
              <span>#{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {showTagInput ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
                placeholder="etiqueta..."
                autoFocus
                className="w-24 px-2 py-0.5 text-xs font-mono-journal bg-white dark:bg-neutral-900 border border-neutral-400 rounded-full focus:outline-none"
              />
              <button
                onClick={handleAddTag}
                className="text-xs px-2 py-0.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-full"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono-journal text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-full"
            >
              <Tag className="w-3 h-3" />
              <span>Etiqueta</span>
            </button>
          )}
        </div>

        {/* Daily Writing Inspiration Spark (Gemini) */}
        {showInspiration && (
          <InspirationCard
            onApplyInspiration={handleApplyInspiration}
            onClose={() => setShowInspiration(false)}
            currentMood={entry.mood}
          />
        )}

        {/* Attached Images Grid */}
        {entry.images && entry.images.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-mono-journal text-neutral-400 mb-2">
              <span>Fotografías adjuntas ({entry.images.length})</span>
              <span className="text-[11px] italic">Haz clic en una imagen para ampliarla</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {entry.images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-100 dark:bg-neutral-900 cursor-pointer shadow-sm"
                  onClick={() => onOpenLightbox(entry.images, idx)}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.caption || `Foto ${idx + 1}`}
                    className="w-full h-44 object-cover grayscale contrast-110 group-hover:scale-102 transition-transform duration-300"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        title="Eliminar foto"
                        className="p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {img.caption && (
                      <p className="font-serif-journal text-xs text-white line-clamp-1 italic bg-black/60 px-2 py-1 rounded">
                        {img.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Image Spinner Feedback */}
        {isProcessingImage && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono-journal text-neutral-600 dark:text-neutral-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-neutral-800 dark:bg-neutral-200 animate-ping" />
            <span>Optimizando y comprimiendo imagen para la nube...</span>
          </div>
        )}

        {/* Body Textarea */}
        <textarea
          ref={textareaRef}
          value={entry.content}
          onChange={(e) => onUpdateEntry({ content: e.target.value })}
          placeholder="Escribe tus pensamientos aquí con total libertad... 
(Puedes arrastrar fotos, pegarlas con Ctrl+V desde el portapapeles o usar el botón de foto arriba)"
          className="w-full font-serif-journal text-base sm:text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700 bg-transparent focus:outline-none resize-none flex-1 min-h-[300px]"
        />

        {/* Bottom Status / Metainfo Bar */}
        <footer className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono-journal text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-3">
            <span>{wordCount} palabras</span>
            <span>·</span>
            <span>{charCount} caracteres</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{readTimeMin} min de lectura</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
              Sincronización en tiempo real activa
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
};
