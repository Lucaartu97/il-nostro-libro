import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { HeartDoodle } from './Decor';

/** Il momento in cui la pagina entra nel libro: un cuore che batte. */
export function SavedOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-desk/90 backdrop-blur-sm"
      role="status"
    >
      <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.55 }}>
        <HeartDoodle className="w-24 animate-heartbeat fill-accent-soft text-accent" />
      </motion.div>
      <p className="font-hand text-4xl text-accent-deep">Pagina custodita.</p>
    </motion.div>
  );
}

/** Eliminare una pagina chiede sempre una seconda conferma. */
export function DeletePage({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)} disabled={disabled}>
        <Trash2 size={17} aria-hidden />
        Strappa questa pagina
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-accent-soft/60 px-4 py-3" role="alertdialog" aria-label="Conferma">
      <p className="w-full text-center italic sm:w-auto">La pagina e i suoi ricordi andranno persi per sempre.</p>
      <button type="button" className="btn btn-primary min-h-10 py-1" onClick={onConfirm} disabled={disabled}>
        Sì, strappala
      </button>
      <button type="button" className="btn btn-ghost min-h-10 py-1" onClick={() => setAsking(false)} autoFocus>
        No, la tengo
      </button>
    </div>
  );
}
