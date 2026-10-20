import React from 'react';
import {
  BookOpen,
  Cloud,
  CloudCheck,
  CloudOff,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Plus,
  Search,
  Download,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SyncStatus } from '../types/journal';

interface NavbarProps {
  syncStatus: SyncStatus;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onNewEntry: () => void;
  onOpenSearch: () => void;
  onOpenExport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  syncStatus,
  isDarkMode,
  onToggleDarkMode,
  isFocusMode,
  onToggleFocusMode,
  onNewEntry,
  onOpenSearch,
  onOpenExport,
}) => {
  const { user, isOnline, signInWithGoogle, logOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-serif-journal font-bold text-sm">
              T
            </span>
            <h1 className="font-serif-journal text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Tinta
            </h1>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono-journal text-neutral-600 dark:text-neutral-400 border-l border-neutral-300 dark:border-neutral-700 pl-3">
            diario de pensamientos
          </span>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-journal rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
            title={
              user
                ? 'Conectado a Google Cloud Firestore. Tus pensamientos están respaldados.'
                : 'Modo local en tu navegador. Inicia sesión para sincronizar automáticamente en la nube.'
            }
          >
            {syncStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-600 dark:bg-neutral-400 animate-ping" />
                <span className="hidden md:inline">Guardando...</span>
              </>
            ) : syncStatus === 'synced' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                <span className="hidden md:inline">Sincronizado</span>
              </>
            ) : syncStatus === 'offline' || !isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full border border-neutral-400 dark:border-neutral-500" />
                <span className="hidden md:inline">Sin conexión</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full border border-neutral-500" />
                <span className="hidden md:inline">Modo local</span>
              </>
            )}
          </div>

          {/* Cloud Auth Connect button if guest */}
          {!user ? (
            <button
              onClick={signInWithGoogle}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-sans-ui font-medium rounded border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Conectar Nube</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-xs font-sans-ui text-neutral-600 dark:text-neutral-400 truncate max-w-[140px]">
                {user.displayName || user.email}
              </span>
              <button
                onClick={logOut}
                title="Cerrar sesión"
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            title="Buscar pensamientos (Ctrl+K)"
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Export All */}
          <button
            onClick={onOpenExport}
            title="Exportar diario"
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Focus Mode */}
          <button
            onClick={onToggleFocusMode}
            title={isFocusMode ? 'Salir de modo concentración' : 'Modo concentración'}
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Dark/Light toggle */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Cambiar a papel claro' : 'Cambiar a tinta oscura'}
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* New Entry Button */}
          <button
            onClick={onNewEntry}
            className="flex items-center gap-1 ml-1 px-3 py-1.5 text-xs font-sans-ui font-medium rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Escribir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
