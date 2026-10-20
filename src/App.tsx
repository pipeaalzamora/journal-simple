import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { JournalList } from './components/JournalList';
import { JournalEditor } from './components/JournalEditor';
import { LightboxModal } from './components/LightboxModal';
import { SearchModal } from './components/SearchModal';
import { ExportModal } from './components/ExportModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalEntry, JournalImage, SyncStatus } from './types/journal';
import {
  getLocalEntries,
  saveLocalEntries,
  subscribeToEntries,
  saveEntryToFirestore,
  deleteEntryFromFirestore,
  syncLocalEntriesToCloud,
  INITIAL_SAMPLE_ENTRY,
  fetchDbStatus,
  saveEntryToMongo,
  deleteEntryFromMongo,
  fetchMongoEntries,
  DbStatusInfo,
} from './lib/journalService';
import { Minimize2, Plus, ExternalLink, X } from 'lucide-react';

function JournalApp() {
  const { user, isOnline, authError, clearAuthError } = useAuth();

  // Dark Mode (Monochrome: Light Paper vs Deep Ink)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('tinta_theme') === 'dark';
  });

  // Focus / Zen Mode
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Journal Entries
  const [entries, setEntries] = useState<JournalEntry[]>(() => getLocalEntries());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(() => {
    const initial = getLocalEntries();
    return initial[0]?.id || null;
  });

  // Sync Status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(user ? 'synced' : 'local');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'with-images'>('all');

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: JournalImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DB status check and load from MongoDB if configured
  useEffect(() => {
    const initDb = async () => {
      const status = await fetchDbStatus();
      setDbStatus(status);

      if (status.provider === 'mongodb' && status.connected) {
        const mongoEntries = await fetchMongoEntries();
        if (mongoEntries && mongoEntries.length > 0) {
          setEntries(mongoEntries);
          saveLocalEntries(mongoEntries);
        }
      }
    };
    initDb();
  }, []);

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tinta_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tinta_theme', 'light');
    }
  }, [isDarkMode]);

  // Cloud sync subscription when user is authenticated
  useEffect(() => {
    if (!user) {
      setSyncStatus('local');
      return;
    }

    setSyncStatus('saving');

    // Migrate any guest entries to user's cloud collection
    const local = getLocalEntries();
    if (local.length > 0) {
      syncLocalEntriesToCloud(user.uid, local).catch((err) => {
        console.warn('Initial cloud sync warning:', err);
      });
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToEntries(
      user.uid,
      (cloudEntries) => {
        if (cloudEntries.length > 0) {
          setEntries(cloudEntries);
          setSelectedEntryId((prev) => {
            if (prev && cloudEntries.some((e) => e.id === prev)) {
              return prev;
            }
            return cloudEntries[0].id;
          });
        }
        setSyncStatus('synced');
      },
      (error) => {
        console.error('Subscription error:', error);
        setSyncStatus('error');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Keep selectedEntryId valid
  useEffect(() => {
    if (entries.length > 0 && (!selectedEntryId || !entries.some((e) => e.id === selectedEntryId))) {
      setSelectedEntryId(entries[0].id);
    }
  }, [entries, selectedEntryId]);

  // Keyboard shortcuts (Cmd+K, Cmd+N, Esc, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      // Cmd/Ctrl + N: New Thought
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewEntry();
      }
      // Cmd/Ctrl + Shift + F: Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
      // Escape: Exit focus mode
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Create New Thought Entry
  const handleNewEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: JournalEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user ? user.uid : 'guest_user',
      title: '',
      content: '',
      images: [],
      tags: [],
      date: today,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    saveLocalEntries(updated);
    setSelectedEntryId(newEntry.id);

    if (user && isOnline) {
      setSyncStatus('saving');
      saveEntryToFirestore(user.uid, newEntry)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    }

    // Sync to MongoDB if active
    saveEntryToMongo(newEntry).catch((err) => console.warn('Mongo save notice:', err));
  }, [entries, user, isOnline]);

  // Update current entry with autosave debounce
  const handleUpdateEntry = (changes: Partial<JournalEntry>) => {
    if (!selectedEntryId) return;

    const now = new Date().toISOString();
    const updatedEntries = entries.map((e) => {
      if (e.id === selectedEntryId) {
        return {
          ...e,
          ...changes,
          updatedAt: now,
        };
      }
      return e;
    });

    setEntries(updatedEntries);
    saveLocalEntries(updatedEntries);

    const targetEntry = updatedEntries.find((e) => e.id === selectedEntryId);
    if (!targetEntry) return;

    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Save to MongoDB
      saveEntryToMongo(targetEntry).catch((err) => console.warn('Mongo update notice:', err));

      // Save to Firestore if authenticated
      if (user && isOnline) {
        try {
          await saveEntryToFirestore(user.uid, targetEntry);
          setSyncStatus('synced');
        } catch (err) {
          console.error('Error auto-saving entry:', err);
          setSyncStatus('error');
        }
      }
    }, 700);

    if (user && isOnline) {
      setSyncStatus('saving');
    } else {
      setSyncStatus(isOnline ? 'local' : 'offline');
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const remaining = entries.filter((item) => item.id !== id);
    setEntries(remaining);
    saveLocalEntries(remaining);

    if (selectedEntryId === id) {
      if (remaining.length > 0) {
        setSelectedEntryId(remaining[0].id);
      } else {
        handleNewEntry();
      }
    }

    // Delete from MongoDB
    deleteEntryFromMongo(id).catch((err) => console.warn('Mongo delete notice:', err));

    if (user && isOnline) {
      setSyncStatus('saving');
      try {
        await deleteEntryFromFirestore(user.uid, id);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error deleting entry:', err);
        setSyncStatus('error');
      }
    }
  };

  // Toggle Pin on an entry
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = entries.find((item) => item.id === id);
    if (!target) return;

    const updatedPinned = !target.pinned;
    const updatedEntries = entries.map((item) =>
      item.id === id ? { ...item, pinned: updatedPinned } : item
    );

    // Re-sort: pinned on top
    updatedEntries.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setEntries(updatedEntries);
    saveLocalEntries(updatedEntries);

    if (user && isOnline) {
      try {
        await saveEntryToFirestore(user.uid, {
          ...target,
          pinned: updatedPinned,
        });
      } catch (err) {
        console.error('Error toggling pin:', err);
      }
    }
  };

  // Open Lightbox
  const handleOpenLightbox = (images: JournalImage[], index: number) => {
    setLightboxState({
      isOpen: true,
      images,
      currentIndex: index,
    });
  };

  // Lightbox update caption
  const handleUpdateImageCaption = (imageId: string, newCaption: string) => {
    if (!selectedEntry) return;
    const updatedImages = (selectedEntry.images || []).map((img) =>
      img.id === imageId ? { ...img, caption: newCaption } : img
    );
    handleUpdateEntry({ images: updatedImages });
    setLightboxState((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  // Lightbox delete image
  const handleDeleteLightboxImage = (imageId: string) => {
    if (!selectedEntry) return;
    const updatedImages = (selectedEntry.images || []).filter(
      (img) => img.id !== imageId
    );
    handleUpdateEntry({ images: updatedImages });
    setLightboxState((prev) => ({
      ...prev,
      images: updatedImages,
    }));
  };

  const selectedEntry =
    entries.find((e) => e.id === selectedEntryId) || entries[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Top Navigation - hidden in Focus mode */}
      {!isFocusMode && (
        <Navbar
          syncStatus={syncStatus}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          onNewEntry={handleNewEntry}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />
      )}

      {/* Cloud Auth notice banner if browser blocks third-party iframe popups */}
      {authError && (
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 px-4 py-2.5 text-xs font-sans-ui text-neutral-800 dark:text-neutral-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              Aviso de conexión en la nube:
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              {authError}
            </span>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2 text-neutral-900 dark:text-neutral-100 hover:opacity-80 shrink-0"
            >
              <span>Abrir en pestaña independiente</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={clearAuthError}
            className="p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 shrink-0"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Focus Mode floating exit banner */}
      {isFocusMode && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsFocusMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-journal rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-lg hover:opacity-90 transition-opacity"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Salir de Concentración (Esc)</span>
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Sidebar / List - hidden in Focus Mode */}
        {!isFocusMode && (
          <JournalList
            entries={entries}
            selectedEntryId={selectedEntryId}
            onSelectEntry={(id) => setSelectedEntryId(id)}
            onDeleteEntry={handleDeleteEntry}
            onTogglePin={handleTogglePin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        )}

        {/* Center Writing Editor */}
        {selectedEntry ? (
          <JournalEditor
            key={selectedEntry.id}
            entry={selectedEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={(id) => handleDeleteEntry(id)}
            onOpenLightbox={handleOpenLightbox}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <p className="font-serif-journal text-lg mb-3">No hay pensamientos seleccionados.</p>
            <button
              onClick={handleNewEntry}
              className="flex items-center gap-2 px-4 py-2 text-xs font-sans-ui bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Escribir primer pensamiento</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <LightboxModal
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIndex) =>
          setLightboxState((prev) => ({ ...prev, currentIndex: newIndex }))
        }
        onUpdateCaption={handleUpdateImageCaption}
        onDeleteImage={handleDeleteLightboxImage}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        entries={entries}
        onSelectEntry={(id) => setSelectedEntryId(id)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entries={entries}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <JournalApp />
    </AuthProvider>
  );
}
