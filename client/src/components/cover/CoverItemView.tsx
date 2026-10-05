import { useState } from 'react';
import { mediaUrl } from '../../lib/cover';
import { formatDate } from '../../lib/format';
import type { Book, CoverItem } from '../../lib/types';
import { FlowerDoodle, HeartDoodle, SprigDoodle, StarDoodle } from '../Decor';

const DOODLES = { cuore: HeartDoodle, stella: StarDoodle, fiore: FlowerDoodle, rametto: SprigDoodle };

function CoverVideo({ mediaId, editing }: { mediaId: string; editing: boolean }) {
  // Sulla copertina i video girano in silenzio, come una foto che si muove; un tocco accende l'audio.
  const [muted, setMuted] = useState(true);
  return (
    <video
      className="cover-video"
      src={mediaUrl(mediaId)}
      muted={muted || editing}
      loop
      playsInline
      autoPlay={!editing}
      preload="metadata"
      onClick={editing ? undefined : () => setMuted((m) => !m)}
      title={editing ? undefined : muted ? 'Tocca per sentire l’audio' : 'Tocca per togliere l’audio'}
    />
  );
}

/** Il contenuto di un elemento della copertina (posizione e rotazione le decide CoverCanvas). */
export function CoverItemView({ item, book, editing }: { item: CoverItem; book: Book; editing: boolean }) {
  switch (item.type) {
    case 'title':
      return (
        <div className="cover-title">
          <span className="cover-title-label">Il libro di</span>
          <span className="cover-title-name">{book.coupleName}</span>
          <span className="cover-title-date">dal {formatDate(book.startDate)}</span>
        </div>
      );
    case 'photo':
      return (
        <div className={`cover-photo${item.frame === 'polaroid' ? ' is-polaroid' : ''}`}>
          <img src={mediaUrl(item.mediaId)} alt="" draggable={false} decoding="async" />
        </div>
      );
    case 'video':
      return <CoverVideo mediaId={item.mediaId} editing={editing} />;
    case 'note':
      return (
        <div className="cover-note" data-color={item.color}>
          {item.text}
        </div>
      );
    case 'text':
      return (
        <p className="cover-text" data-font={item.font} data-color={item.color}>
          {item.text}
        </p>
      );
    case 'sticker': {
      const Doodle = DOODLES[item.sticker as keyof typeof DOODLES];
      return <span className="cover-sticker">{Doodle ? <Doodle /> : item.sticker}</span>;
    }
  }
}

export function itemLabel(item: CoverItem): string {
  switch (item.type) {
    case 'title':
      return 'Titolo del libro';
    case 'photo':
      return 'Foto';
    case 'video':
      return 'Video';
    case 'note':
      return `Post-it: ${item.text}`;
    case 'text':
      return `Messaggio: ${item.text}`;
    case 'sticker':
      return `Sticker ${item.sticker}`;
  }
}
