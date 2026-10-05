-- Il Nostro Libro — schema iniziale

CREATE TABLE books (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name  text NOT NULL,
  partner_one  text NOT NULL,
  partner_two  text NOT NULL,
  start_date   date NOT NULL,
  theme        text NOT NULL DEFAULT 'rosa'
               CHECK (theme IN ('rosa', 'bordeaux', 'oro', 'pesca')),
  -- Impronta (scrypt) del codice d'accesso condiviso: il codice in chiaro non viene mai salvato.
  code_lookup  text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       uuid NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  entry_date    date NOT NULL,
  title         text NOT NULL,
  tag           text NOT NULL DEFAULT 'giornata'
                CHECK (tag IN ('giornata', 'pensiero', 'difficolta', 'momento-bello', 'altro')),
  content_html  text NOT NULL DEFAULT '',
  -- Solo testo, senza markup: serve alla ricerca.
  content_text  text NOT NULL DEFAULT '',
  author        text NOT NULL,
  is_favorite   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entries_book_order_idx ON entries (book_id, entry_date, created_at);
CREATE INDEX entries_book_tag_idx ON entries (book_id, tag);
CREATE INDEX entries_book_favorite_idx ON entries (book_id) WHERE is_favorite;

CREATE TABLE media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        uuid NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  -- NULL finché la pagina che lo contiene non viene salvata.
  entry_id       uuid REFERENCES entries (id) ON DELETE CASCADE,
  kind           text NOT NULL
                 CHECK (kind IN ('image', 'gif', 'video', 'audio', 'youtube', 'spotify')),
  -- File caricati: nome su disco dentro UPLOAD_DIR/<book_id>/.
  file_name      text,
  original_name  text,
  mime           text,
  size_bytes     integer,
  -- Contenuti esterni: id YouTube, percorso Spotify ("track/…") o URL di una GIF.
  external_ref   text,
  caption        text NOT NULL DEFAULT '',
  position       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((file_name IS NULL) <> (external_ref IS NULL))
);

CREATE INDEX media_entry_idx ON media (entry_id, position);
CREATE INDEX media_orphans_idx ON media (created_at) WHERE entry_id IS NULL;
