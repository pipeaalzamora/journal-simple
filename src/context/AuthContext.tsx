import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  testConnection,
  type User,
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    // 1. Validate connection to Firestore as mandated by SKILL.md
    testConnection().catch((err) => {
      console.warn('Initial Firestore ping note:', err);
    });

    // 2. Track online/offline browser state
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Listen to Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setAuthError(null);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const code = error?.code || '';

      // User closed the popup window voluntarily or cancelled
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        return;
      }

      if (code === 'auth/popup-blocked') {
        setAuthError(
          'Tu navegador ha bloqueado la ventana emergente de autenticación. Permite las ventanas emergentes o abre el diario en una pestaña independiente.'
        );
        return;
      }

      if (code === 'auth/network-request-failed') {
        setAuthError(
          'El navegador bloqueó la conexión entre dominios dentro del visor incrustado (política de cookies de terceros). Puedes abrir la aplicación en una pestaña independiente para sincronizar con Google o seguir escribiendo en modo local.'
        );
        return;
      }

      setAuthError(
        error?.message ||
          'No se pudo conectar con Google en este momento. Tus notas continúan protegidas en modo local.'
      );
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setAuthError(null);
    } catch (error) {
      console.warn('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOnline,
        authError,
        clearAuthError,
        signInWithGoogle,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
