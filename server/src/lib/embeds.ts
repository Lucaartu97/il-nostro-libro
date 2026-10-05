export type Embed = { kind: 'youtube' | 'spotify' | 'gif'; externalRef: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Riconosce i link che il libro sa incorniciare: YouTube, Spotify e GIF di Giphy/Tenor. */
export function parseEmbed(raw: string): Embed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    const id = parts[0] ?? '';
    return YOUTUBE_ID.test(id) ? { kind: 'youtube', externalRef: id } : null;
  }
  if (hostIs(host, 'youtube.com') || hostIs(host, 'youtube-nocookie.com')) {
    const id =
      parts[0] === 'watch'
        ? (url.searchParams.get('v') ?? '')
        : ['shorts', 'embed', 'live'].includes(parts[0] ?? '')
          ? (parts[1] ?? '')
          : '';
    return YOUTUBE_ID.test(id) ? { kind: 'youtube', externalRef: id } : null;
  }

  if (host === 'open.spotify.com') {
    const rest = parts[0]?.startsWith('intl-') ? parts.slice(1) : parts;
    const [type = '', id = ''] = rest[0] === 'embed' ? rest.slice(1) : rest;
    return SPOTIFY_TYPES.has(type) && SPOTIFY_ID.test(id)
      ? { kind: 'spotify', externalRef: `${type}/${id}` }
      : null;
  }

  if (hostIs(host, 'giphy.com')) {
    // Pagina di una GIF (giphy.com/gifs/titolo-ID): ricaviamo il file diretto.
    if ((host === 'giphy.com' || host === 'www.giphy.com') && parts[0] === 'gifs' && parts[1]) {
      const last = parts[parts.length - 1] ?? '';
      const id = last.split('-').pop() ?? '';
      return /^[A-Za-z0-9]{8,}$/.test(id)
        ? { kind: 'gif', externalRef: `https://media.giphy.com/media/${id}/giphy.gif` }
        : null;
    }
    if (/\.(gif|webp)$/i.test(url.pathname)) {
      return { kind: 'gif', externalRef: `https://${host}${url.pathname}` };
    }
    return null;
  }
  if (hostIs(host, 'tenor.com') && /\.(gif|webp)$/i.test(url.pathname)) {
    return { kind: 'gif', externalRef: `https://${host}${url.pathname}` };
  }
  return null;
}
