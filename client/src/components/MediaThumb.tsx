import { Film, Music, Play } from 'lucide-react';
import type { Media } from '../lib/types';

const DESCRIPTIONS: Record<Media['kind'], string> = {
  image: 'Fotografia',
  gif: 'GIF',
  video: 'Video',
  audio: 'Canzone',
  youtube: 'Video di YouTube',
  spotify: 'Musica da Spotify',
};

export const mediaLabel = (media: Media) => media.originalName ?? DESCRIPTIONS[media.kind];

/** Miniatura per l’elenco dei contenuti allegati nell’editor. */
export function MediaThumb({ media }: { media: Media }) {
  const box = 'grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-lg bg-accent-soft text-accent-deep';
  if (media.kind === 'image' || media.kind === 'gif') {
    return (
      <div className={box}>
        <img src={media.url ?? media.externalRef ?? ''} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (media.kind === 'youtube') {
    return (
      <div className={`${box} relative`}>
        <img src={`https://i.ytimg.com/vi/${media.externalRef}/default.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
        <Play size={18} className="absolute fill-white text-white drop-shadow" aria-hidden />
      </div>
    );
  }
  return <div className={box}>{media.kind === 'video' ? <Film size={22} aria-hidden /> : <Music size={22} aria-hidden />}</div>;
}
