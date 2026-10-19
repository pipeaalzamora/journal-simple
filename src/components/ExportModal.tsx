import React from 'react';
import { X, Download, FileText, Database } from 'lucide-react';
import { JournalEntry } from '../types/journal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(entries, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute(
      'download',
      `tinta-diario-backup-${new Date().toISOString().split('T')[0]}.json`
    );
    dlAnchorElem.click();
  };

  const handleExportAllMarkdown = () => {
    let combinedMd = `# Mi Diario - Tinta
Exportado el ${new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}
Total de pensamientos: ${entries.length}

---

`;

    entries.forEach((entry) => {
      combinedMd += `## ${entry.title || 'Pensamiento del ' + entry.date}
*Fecha: ${entry.date}*
${entry.mood ? `*Estado de ánimo: ${entry.mood}*  \n` : ''}${
        entry.tags && entry.tags.length > 0
          ? `*Etiquetas: ${entry.tags.map((t) => `#${t}`).join(' ')}*  \n`
          : ''
      }
${entry.content}

`;
      if (entry.images && entry.images.length > 0) {
        combinedMd += `*Imágenes adjuntas: ${entry.images.length} foto(s)*\n\n`;
      }
      combinedMd += `---\n\n`;
    });

    const blob = new Blob([combinedMd], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tinta-diario-completo-${
      new Date().toISOString().split('T')[0]
    }.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-serif-journal text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Exportar Diario
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="font-sans-ui text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Tus pensamientos te pertenecen. Puedes descargar una copia completa en
          formato Markdown legible o un respaldo estructurado en JSON.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleExportAllMarkdown}
            className="w-full flex items-center gap-3 p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-black dark:hover:border-white transition-colors group"
          >
            <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Archivo Markdown (.md)
              </div>
              <div className="font-mono-journal text-[11px] text-neutral-500">
                Ideal para Obsidian, Notion o lectura directa
              </div>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-black dark:hover:border-white transition-colors group"
          >
            <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Copia de Seguridad JSON
              </div>
              <div className="font-mono-journal text-[11px] text-neutral-500">
                Incluye todos los metadatos y fotos optimizadas
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-sans-ui rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
