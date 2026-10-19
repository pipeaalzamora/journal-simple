import React from 'react';
import {
  Pin,
  Image as ImageIcon,
  Calendar,
  Tag as TagIcon,
  Trash2,
  Smile,
  Search,
  X,
} from 'lucide-react';
import { JournalEntry } from '../types/journal';

interface JournalListProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  activeFilter: 'all' | 'pinned' | 'with-images';
  onFilterChange: (filter: 'all' | 'pinned' | 'with-images') => void;
}

export const JournalList: React.FC<JournalListProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onTogglePin,
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  activeFilter,
  onFilterChange,
}) => {
  // Collect all unique tags
  const allTags = Array.from(
    new Set(entries.flatMap((entry) => entry.tags || []))
  ).filter(Boolean);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = entry.title?.toLowerCase().includes(q);
      const contentMatch = entry.content?.toLowerCase().includes(q);
      const tagMatch = entry.tags?.some((t) => t.toLowerCase().includes(q));
      if (!titleMatch && !contentMatch && !tagMatch) return false;
    }

    // Tag filter
    if (selectedTag && (!entry.tags || !entry.tags.includes(selectedTag))) {
      return false;
    }

    // Tab filter
    if (activeFilter === 'pinned' && !entry.pinned) return false;
    if (activeFilter === 'with-images' && (!entry.images || entry.images.length === 0)) {
      return false;
    }

    return true;
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoStr;
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full bg-neutral-50/50 dark:bg-neutral-900/30 transition-colors">
      {/* Search Input Bar */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar pensamientos..."
            className="w-full pl-9 pr-8 py-1.5 text-xs font-sans-ui bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 mt-2.5 text-xs font-sans-ui">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            Todas ({entries.length})
          </button>
          <button
            onClick={() => onFilterChange('pinned')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'pinned'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            Fijadas
          </button>
          <button
            onClick={() => onFilterChange('with-images')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'with-images'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            Con fotos
          </button>
        </div>

        {/* Tags horizontal list */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-journal rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shrink-0"
              >
                <span>#{selectedTag}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 text-[11px] font-mono-journal rounded-full border shrink-0 transition-colors ${
                  selectedTag === tag
                    ? 'hidden'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 font-sans-ui text-xs">
            No se encontraron pensamientos.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const snippet = entry.content?.replace(/\n+/g, ' ').slice(0, 110) || 'Sin contenido';

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry.id)}
                className={`group p-4 cursor-pointer transition-colors relative ${
                  isSelected
                    ? 'bg-neutral-200/70 dark:bg-neutral-800/80 border-l-2 border-l-black dark:border-l-white'
                    : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px] font-mono-journal text-neutral-600 dark:text-neutral-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                    {formatDate(entry.createdAt || entry.date)}
                  </span>
                  <div className="flex items-center gap-1">
                    {entry.mood && (
                      <span className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 px-1 rounded">
                        {entry.mood}
                      </span>
                    )}
                    {entry.pinned && (
                      <Pin className="w-3 h-3 fill-neutral-800 dark:fill-neutral-200 text-neutral-800 dark:text-neutral-200" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
                  {entry.title || snippet.slice(0, 40) || 'Pensamiento sin título'}
                </h3>

                {/* Body Snippet */}
                <p className="font-serif-journal text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                  {snippet}
                </p>

                {/* Attached Images preview & Tags */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.images && entry.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-journal text-neutral-500 dark:text-neutral-400 bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        <ImageIcon className="w-3 h-3" />
                        <span>{entry.images.length}</span>
                      </span>
                    )}
                    {entry.tags?.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono-journal text-neutral-500 dark:text-neutral-400"
                      >
                        #{t}
                      </span>
                    ))}
                    {entry.tags && entry.tags.length > 2 && (
                      <span className="text-[10px] font-mono-journal text-neutral-400">
                        +{entry.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={(e) => onTogglePin(entry.id, e)}
                      title={entry.pinned ? 'Desfijar' : 'Fijar al inicio'}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-300/40 dark:hover:bg-neutral-700"
                    >
                      <Pin className={`w-3 h-3 ${entry.pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => onDeleteEntry(entry.id, e)}
                      title="Eliminar pensamiento"
                      className="p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-300/40 dark:hover:bg-neutral-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
