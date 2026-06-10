import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

const styles = {
  success: { icon: 'check-circle', accent: 'text-green-600 dark:text-green-400' },
  error: { icon: 'x-circle', accent: 'text-red-600 dark:text-red-400' },
  info: { icon: 'info-circle', accent: 'text-primary-600 dark:text-primary-400' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 5000 : 3500);
  }, [dismiss]);

  const toastRef = useRef(null);
  toastRef.current = push;

  // Session expiry is signalled by the api wrapper via a window event so it
  // can be surfaced here without coupling provider order to AuthContext.
  useEffect(() => {
    const onUnauthorized = () => toastRef.current('info', 'Session expired — please sign in again');
    window.addEventListener('gradus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('gradus:unauthorized', onUnauthorized);
  }, []);

  const api = useRef({
    success: (msg) => toastRef.current('success', msg),
    error: (msg) => toastRef.current('error', msg),
    info: (msg) => toastRef.current('info', msg),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-36 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-stroke bg-white px-4 py-3 shadow-card dark:border-dark-3 dark:bg-dark-2 dark:shadow-card-dark"
          >
            <Icon name={styles[t.type].icon} className={`h-5 w-5 shrink-0 ${styles[t.type].accent}`} />
            <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-gray-400 transition hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
            >
              <Icon name="x-mark" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
