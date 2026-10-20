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
  Send,
} from 'lucide-react';
import { JournalEntry, JournalImage } from '../types/journal';
import {
  processAndCompressImage,
  extractImagesFromClipboard,
  extractImagesFromDrop,
} from '../lib/imageUtils';
import { useAuth } from '../context/AuthContext';
import { uploadImageToStorage } from '../lib/firebase';

interface JournalEditorProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onPublishEntry: () => void;
  isPublishing?: boolean;
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
  onPublishEntry,
  isPublishing,
  onOpenLightbox,
  isFocusMode,
  onToggleFocusMode,
}) => {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Handle Image upload: using Firebase Storage Bucket if user is logged in
  const handleImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessingImage(true);
    try {
      const newImages: JournalImage[] = [];
      for (const file of files) {
        let imageUrl = '';
        if (user) {
          try {
            imageUrl = await uploadImageToStorage(user.uid, file);
          } catch (storageErr) {
            console.warn('Storage bucket upload fallback to local dataUrl:', storageErr);
            const processed = await processAndCompressImage(file);
            imageUrl = processed.dataUrl;
          }
        } else {
          const processed = await processAndCompressImage(file);
          imageUrl = processed.dataUrl;
        }

        const newImg: JournalImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: imageUrl,
          caption: file.name,
          createdAt: new Date().toISOString(),
        };
        newImages.push(newImg);
      }

      onUpdateEntry({
        images: [...(entry.images || []), ...newImages],
      });
    } catch (err) {
      console.error('Error handling image files:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Handle Clipboard Paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const imageFiles = extractImagesFromClipboard(e);
      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleImageFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [entry.images, user]);

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
    await handleImageFiles(files);
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

  const formatDisplayDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col bg-white dark:bg-neutral-950 relative overflow-y-auto transition-colors ${
        isFocusMode ? 'p-6 sm:p-12 md:p-16 max-w-4xl mx-auto w-full' : 'p-4 sm:p-8'
      }`}
    >
      {/* Hidden file input for photos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={async (e) => {
          if (e.target.files) {
            await handleImageFiles(Array.from(e.target.files));
          }
        }}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Drag & Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white border-2 border-dashed border-white m-4 rounded-xl pointer-events-none">
          <Upload className="w-10 h-10 animate-bounce mb-3" />
          <p className="font-serif-journal text-lg font-medium">
            Sube tus fotos al Bucket de Firebase
          </p>
          <p className="font-sans-ui text-xs text-neutral-400 mt-1">
            Se almacenarán de forma segura en tu cuenta.
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

            {/* Add Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono-journal rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-800 dark:hover:border-neutral-200 transition-colors"
              title="Subir imagen al Bucket de Firebase"
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

        {/* Attached Images Grid */}
        {entry.images && entry.images.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-mono-journal text-neutral-400 mb-2">
              <span>Fotografías en Bucket ({entry.images.length})</span>
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
                    alt={img.caption || 'Imagen adjunta'}
                    className="w-full h-32 object-cover transition-transform group-hover:scale-105 duration-300"
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
            <span>Subiendo imagen al Bucket de Firebase...</span>
          </div>
        )}

        {/* Textarea Editor */}
        <textarea
          ref={textareaRef}
          value={entry.content}
          onChange={(e) => onUpdateEntry({ content: e.target.value })}
          placeholder="Escribe lo que tengas en mente..."
          className="w-full flex-1 font-serif-journal text-base sm:text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-700 bg-transparent focus:outline-none resize-none min-h-[280px]"
        />

        {/* Bottom Post Bar with Publish Button */}
        <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="text-xs font-mono-journal text-neutral-400">
            {entry.content.trim().split(/\s+/).filter(Boolean).length} palabras ·{' '}
            {entry.content.length} caracteres
          </div>

          <button
            onClick={onPublishEntry}
            disabled={isPublishing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-sans-ui font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isPublishing ? 'animate-bounce' : ''}`} />
            <span>{isPublishing ? 'Publicando...' : 'Publicar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
