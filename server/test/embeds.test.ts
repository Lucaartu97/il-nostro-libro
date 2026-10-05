import { describe, expect, it } from 'vitest';
import { parseEmbed } from '../src/lib/embeds.js';

describe('parseEmbed', () => {
  it('riconosce i link di YouTube nelle loro forme', () => {
    const expected = { kind: 'youtube', externalRef: 'dQw4w9WgXcQ' };
    expect(parseEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toEqual(expected);
    expect(parseEmbed('https://youtu.be/dQw4w9WgXcQ?si=abc')).toEqual(expected);
    expect(parseEmbed('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toEqual(expected);
  });

  it('riconosce brani e playlist di Spotify', () => {
    expect(parseEmbed('https://open.spotify.com/intl-it/track/4cOdK2wGLETKBW3PvgPWqT?si=x')).toEqual({
      kind: 'spotify',
      externalRef: 'track/4cOdK2wGLETKBW3PvgPWqT',
    });
    expect(parseEmbed('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')?.kind).toBe('spotify');
  });

  it('riconosce le GIF di Giphy e Tenor', () => {
    expect(parseEmbed('https://giphy.com/gifs/love-heart-3o7TKoWXm3okO1kgHC')).toEqual({
      kind: 'gif',
      externalRef: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif',
    });
    expect(parseEmbed('https://media.tenor.com/abc123/cuore.gif')?.kind).toBe('gif');
  });

  it('rifiuta tutto il resto', () => {
    expect(parseEmbed('non un link')).toBeNull();
    expect(parseEmbed('javascript:alert(1)')).toBeNull();
    expect(parseEmbed('https://example.com/video.mp4')).toBeNull();
    expect(parseEmbed('https://evil.com/giphy.com/x.gif')).toBeNull();
    expect(parseEmbed('https://www.youtube.com/watch?v=troppo-corto')).toBeNull();
  });
});
