-- Copertina personalizzabile: foto, video, post-it, messaggi e sticker disposti liberamente.

-- Composizione della copertina (sfondo + elementi). NULL = copertina predefinita.
ALTER TABLE books ADD COLUMN cover jsonb;

-- I file usati in copertina non appartengono a nessuna pagina: questo li distingue
-- dai caricamenti rimasti orfani, che vengono ripuliti dopo 24 ore.
ALTER TABLE media ADD COLUMN on_cover boolean NOT NULL DEFAULT false;
