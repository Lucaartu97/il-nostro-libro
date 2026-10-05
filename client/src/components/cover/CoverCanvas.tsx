import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { clamp } from '../../lib/cover';
import type { Book, Cover, CoverItem } from '../../lib/types';
import { CoverItemView, itemLabel } from './CoverItemView';

interface Editing {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

interface CoverCanvasProps {
  cover: Cover;
  book: Book;
  /** Presente solo nell'editor: gli elementi si selezionano e si trascinano. */
  editing?: Editing;
}

/** La tela della copertina. Va dentro un contenitore ".cover-fit cover-bg-…". */
export function CoverCanvas({ cover, book, editing }: CoverCanvasProps) {
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; fromX: number; fromY: number; x: number; y: number } | null>(null);

  const startDrag = (e: PointerEvent, item: CoverItem) => {
    if (!editing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    editing.onSelect(item.id);
    drag.current = { id: item.id, fromX: e.clientX, fromY: e.clientY, x: item.x, y: item.y };
  };
  const moveDrag = (e: PointerEvent) => {
    const d = drag.current;
    const box = canvas.current?.getBoundingClientRect();
    if (!editing || !d || !box) return;
    editing.onMove(
      d.id,
      clamp(d.x + ((e.clientX - d.fromX) / box.width) * 100, 0, 100),
      clamp(d.y + ((e.clientY - d.fromY) / box.height) * 100, 0, 100),
    );
  };
  const endDrag = () => {
    drag.current = null;
  };

  // Anche da tastiera: frecce per spostare (Maiusc = passi più lunghi), Canc per togliere.
  const onKeyDown = (e: KeyboardEvent, item: CoverItem) => {
    if (!editing) return;
    const step = e.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      editing.onMove(item.id, clamp(item.x + move[0], 0, 100), clamp(item.y + move[1], 0, 100));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      editing.onRemove(item.id);
    }
  };

  const items = [...cover.items].sort((a, b) => a.z - b.z);
  return (
    <div ref={canvas} className="cover-canvas" onPointerDown={editing ? () => editing.onSelect(null) : undefined}>
      {items.map((item) => {
        const style = { '--x': item.x, '--y': item.y, '--w': item.w, '--rot': item.rot, zIndex: item.z } as CSSProperties;
        if (!editing) {
          return (
            <div key={item.id} className="cover-item" style={style}>
              <CoverItemView item={item} book={book} editing={false} />
            </div>
          );
        }
        const selected = editing.selectedId === item.id;
        return (
          <div
            key={item.id}
            className={`cover-item is-editable${selected ? ' is-selected' : ''}`}
            style={style}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={itemLabel(item)}
            onPointerDown={(e) => startDrag(e, item)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onFocus={() => editing.onSelect(item.id)}
            onKeyDown={(e) => onKeyDown(e, item)}
          >
            <CoverItemView item={item} book={book} editing />
          </div>
        );
      })}
    </div>
  );
}
