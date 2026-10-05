import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Toast, useLive } from '../context/Live';
import { HeartDoodle } from './Decor';

function ToastCard({ toast }: { toast: Toast }) {
  const { dismissToast } = useLive();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), 9000);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  const open = () => {
    dismissToast(toast.id);
    if (toast.entryId) navigate(`/libro?pagina=${toast.entryId}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      className="card pointer-events-auto flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2"
      role="status"
    >
      <HeartDoodle className="w-6 flex-none text-accent" />
      <button type="button" onClick={open} className="flex-1 text-left leading-snug">
        {toast.text}
        {toast.entryId && <span className="ml-1.5 font-bold text-accent-deep">Leggila</span>}
      </button>
      <button type="button" className="icon-btn" onClick={() => dismissToast(toast.id)} aria-label="Chiudi">
        <X size={18} />
      </button>
    </motion.div>
  );
}

/** Notifiche delicate: quello che succede nel libro mentre lo avete aperto. */
export function Toasts() {
  const { toasts } = useLive();
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(30rem,calc(100%-1.5rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
