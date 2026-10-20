import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { JournalList } from './components/JournalList';
import { JournalEditor } from './components/JournalEditor';
import { LightboxModal } from './components/LightboxModal';
import { SearchModal } from './components/SearchModal';
import { ExportModal } from './components/ExportModal';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalEntry, JournalImage, SyncStatus } from './types/journal';
import {
  subscribeToEntries,
  saveEntryToFirestore,
  deleteEntryFromFirestore,
  saveEntryToMongo,
  deleteEntryFromMongo,
  fetchMongoEntries,
  DbStatusInfo,
} from './lib/journalService';
import { Minimize2, Plus, ExternalLink, X, CheckCircle } from 'lucide-react';

function JournalApp() {
  const { user, loading, isOnline, authError, clearAuthError } = useAuth();

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('tinta_theme') === 'dark';
  });

  // Focus / Zen Mode
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Journal Entries
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Sync & Publish Status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishToast, setPublishToast] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'with-images'>('all');

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: JournalImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

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
    if (!user) return;

    setSyncStatus('saving');

    // Also fetch from MongoDB for this user
    fetchMongoEntries().then((mongoEntries) => {
      if (mongoEntries && mongoEntries.length > 0) {
        const userMongo = mongoEntries.filter((e) => e.userId === user.uid || !e.userId);
        if (userMongo.length > 0) {
          setEntries(userMongo);
          setSelectedEntryId(userMongo[0].id);
        }
      }
    });

    // Subscribe to Firestore updates for user
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
        } else if (entries.length === 0) {
          // Create initial sample entry if empty
          const sample: JournalEntry = {
            id: `entry_${Date.now()}`,
            userId: user.uid,
            title: 'Mi primer pensamiento',
            content: 'Escribe aquí tu primer pensamiento en Tinta. Todo se guarda en tu base de datos personal al pulsar Postear.',
            images: [],
            tags: ['bienvenida'],
            date: new Date().toISOString().split('T')[0],
            pinned: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setEntries([sample]);
          setSelectedEntryId(sample.id);
          saveEntryToFirestore(user.uid, sample);
          saveEntryToMongo(sample);
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

  // Keyboard shortcuts (Cmd+K, Cmd+N, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewEntry();
      }
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Create New Thought Entry
  const handleNewEntry = useCallback(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const newEntry: JournalEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
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
    setSelectedEntryId(newEntry.id);
  }, [entries, user]);

  // Update current entry state locally
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
  };

  // Publish / Post current entry to Database (MongoDB + Firestore)
  const handlePublishEntry = async () => {
    if (!selectedEntry || !user) return;

    setIsPublishing(true);
    setSyncStatus('saving');

    const now = new Date().toISOString();
    const entryToPublish: JournalEntry = {
      ...selectedEntry,
      userId: user.uid,
      updatedAt: now,
    };

    try {
      // 1. Save to MongoDB
      await saveEntryToMongo(entryToPublish);

      // 2. Save to Firestore
      if (isOnline) {
        await saveEntryToFirestore(user.uid, entryToPublish);
      }

      setSyncStatus('synced');
      setPublishToast('¡Post publicado con éxito!');
      setTimeout(() => setPublishToast(null), 4000);
    } catch (err) {
      console.error('Error publishing entry:', err);
      setSyncStatus('error');
      setPublishToast('Error al publicar.');
      setTimeout(() => setPublishToast(null), 4000);
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const remaining = entries.filter((item) => item.id !== id);
    setEntries(remaining);

    if (selectedEntryId === id) {
      if (remaining.length > 0) {
        setSelectedEntryId(remaining[0].id);
      } else {
        handleNewEntry();
      }
    }

    deleteEntryFromMongo(id).catch(() => {});
    if (user && isOnline) {
      deleteEntryFromFirestore(user.uid, id).catch(() => {});
    }
  };

  // Toggle Pin on an entry
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = entries.find((item) => item.id === id);
    if (!target || !user) return;

    const updatedPinned = !target.pinned;
    const updatedEntries = entries.map((item) =>
      item.id === id ? { ...item, pinned: updatedPinned } : item
    );

    updatedEntries.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setEntries(updatedEntries);

    const updatedTarget = { ...target, pinned: updatedPinned };
    saveEntryToMongo(updatedTarget).catch(() => {});
    if (isOnline) {
      saveEntryToFirestore(user.uid, updatedTarget).catch(() => {});
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

  // If loading or not authenticated, show LoginScreen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <span className="w-4 h-4 rounded-full bg-black dark:bg-white animate-ping" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

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

      {/* Publish Toast Notification */}
      {publishToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2 rounded-xl text-xs font-sans-ui shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{publishToast}</span>
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
            onPublishEntry={handlePublishEntry}
            isPublishing={isPublishing}
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
