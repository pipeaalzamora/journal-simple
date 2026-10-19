import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, RefreshCw, Server, Cloud, HardDrive } from 'lucide-react';
import { DbStatusInfo } from '../lib/journalService';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatusInfo | null;
  onRefresh: () => Promise<void>;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefresh,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const isMongoConnected = dbStatus?.connected && dbStatus?.provider === 'mongodb';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-black text-white dark:bg-white dark:text-black">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="font-serif-journal text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Almacenamiento y Base de Datos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Overview */}
        <p className="font-sans-ui text-xs text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Tus pensamientos se respaldan de manera redundante para que nunca pierdas una sola palabra:
        </p>

        {/* Storage Layers */}
        <div className="mt-4 space-y-3">
          {/* MongoDB Layer */}
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mt-0.5">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    MongoDB
                  </span>
                  {isMongoConnected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-journal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                      <Check className="w-2.5 h-2.5" />
                      Activo y Sincronizando
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-journal text-neutral-500 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                      Esperando MONGODB_URI
                    </span>
                  )}
                </div>
                <p className="font-sans-ui text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {isMongoConnected
                    ? 'Los pensamientos se guardan y consultan directamente en tu colección de MongoDB.'
                    : 'Backend listo para conectar. Agrega tu cadena MONGODB_URI en la configuración de entorno.'}
                </p>
              </div>
            </div>
          </div>

          {/* Google Cloud Firestore Layer */}
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-start gap-3">
            <div className="p-2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mt-0.5">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Google Cloud Firestore
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-journal text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                  <Check className="w-2.5 h-2.5" />
                  Configurado
                </span>
              </div>
              <p className="font-sans-ui text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Base de datos en la nube vinculada a tu cuenta con reglas de seguridad por usuario.
              </p>
            </div>
          </div>

          {/* Local Storage Layer */}
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-start gap-3">
            <div className="p-2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mt-0.5">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-journal font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Caché Local del Dispositivo
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-journal text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                  <Check className="w-2.5 h-2.5" />
                  Activo
                </span>
              </div>
              <p className="font-sans-ui text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Garantiza que siempre puedas escribir y leer tus notas al instante, incluso sin conexión.
              </p>
            </div>
          </div>
        </div>

        {/* MongoDB Instructions */}
        {!isMongoConnected && (
          <div className="mt-4 p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-900/50 text-xs font-sans-ui">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1">
              ¿Cómo conectar tu base de datos de MongoDB?
            </span>
            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400 text-[11px] font-mono-journal">
              <li>Crea tu base de datos o clúster gratuito en MongoDB Atlas.</li>
              <li>Copia tu cadena de conexión URI (ejemplo: <span className="text-neutral-800 dark:text-neutral-200">mongodb+srv://...</span>).</li>
              <li>Añade la variable <span className="font-bold text-neutral-900 dark:text-neutral-100">MONGODB_URI</span> en tus variables / secrets de AI Studio.</li>
              <li>Pulsa el botón de verificar abajo. ¡La sincronización será inmediata!</li>
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-journal rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Verificar conexión</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-sans-ui font-medium rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
