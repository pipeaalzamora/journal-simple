import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, Cloud, BookOpen } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-6 selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <div className="max-w-md w-full text-center space-y-8 animate-fadeIn">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-serif-journal font-bold text-2xl shadow-xl">
            T
          </div>
          <h1 className="font-serif-journal text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Tinta
          </h1>
          <p className="font-mono-journal text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Diario personal de pensamientos
          </p>
        </div>

        {/* Description */}
        <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 backdrop-blur-sm space-y-4">
          <p className="font-serif-journal text-sm sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300 italic">
            "Un espacio íntimo y silencioso donde tus palabras quedan grabadas para siempre en la nube y sincronizadas con tu cuenta."
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-left text-xs font-mono-journal text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100 shrink-0" />
              <span>Privacidad total por usuario</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100 shrink-0" />
              <span>Fotos en Firebase Bucket</span>
            </div>
          </div>
        </div>

        {/* Error notice if any */}
        {authError && (
          <div className="p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 font-sans-ui flex items-center justify-between gap-2">
            <span>{authError}</span>
            <button onClick={clearAuthError} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        {/* Login Action */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl font-sans-ui text-sm font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-95 transition-all shadow-lg group"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.584s3.344-7.584 7.439-7.584c2.333 0 3.894.99 4.785 1.843l2.45-2.381C17.915 1.488 15.347 0 12.24 0 5.485 0 0 5.485 0 12.24s5.485 12.24 12.24 12.24c7.058 0 11.737-4.965 11.737-11.96 0-.828-.088-1.46-.197-2.035H12.24z" />
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>

          <p className="font-sans-ui text-[11px] text-neutral-400 dark:text-neutral-500">
            Al iniciar sesión, accederás de forma segura a tus pensamientos y fotografías almacenadas en la base de datos.
          </p>
        </div>
      </div>
    </div>
  );
};
