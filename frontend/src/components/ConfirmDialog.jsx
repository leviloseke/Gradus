import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        title: opts.title || 'Are you sure?',
        body: opts.body || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        danger: opts.danger ?? false,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setDialog(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!dialog) return;
    cancelBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="toast-in card w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  dialog.danger
                    ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
                }`}
              >
                <Icon name="exclamation-triangle" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-base font-semibold text-gray-900 dark:text-white">
                  {dialog.title}
                </h2>
                {dialog.body && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dialog.body}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button ref={cancelBtnRef} className="btn-secondary" onClick={() => close(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                className={dialog.danger ? 'btn-danger !px-4 !py-2.5' : 'btn-primary'}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
