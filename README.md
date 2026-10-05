# Il Nostro Libro

> Il tempo trasforma i momenti in ricordi. Questo libro li custodisce per voi.

Un diario digitale di coppia da scrivere a quattro mani e sfogliare come un libro vero: giornate, pensieri,
difficoltà e momenti felici, con foto, video, canzoni e GIF. Nessun account e nessuna email: il libro si apre
con una chiave condivisa, soltanto vostra.

## Cosa sa fare

- **Libro sfogliabile** — parte chiuso sulla copertina e si apre in 3D; doppia pagina su schermi larghi, pagina
  singola su telefono (clic, frecce della tastiera o swipe). Frontespizio, indice con numeri di pagina, pagine numerate.
- **Copertina personalizzabile** — una tela libera su cui appoggiare foto (anche più insieme, a collage), video,
  post-it, messaggi, sticker ed emoji: si trascinano, si ingrandiscono, si inclinano, si sovrappongono. Cinque sfondi.
- **Editor a piena pagina** — data, titolo, etichetta (Giornata / Pensiero / Difficoltà / Momento bello / Altro),
  firma di chi scrive, testo con grassetto, corsivo, elenchi e citazioni.
- **Multimedia** — trascina foto (JPG, PNG, WEBP), GIF, video MP4 e canzoni MP3 fino a 10 MB ciascuno; incolla
  link di Spotify, YouTube, Giphy o Tenor. Ogni contenuto può avere una didascalia.
- **Scrivere in due, in tempo reale** — vedi quando il partner ha il libro aperto o sta scrivendo, ricevi una
  notifica delicata quando aggiunge una pagina, e una pagina aperta in modifica non può essere sovrascritta.
- **Ritrovare i ricordi** — ricerca nel testo, filtro per etichetta, vista cronologica, momenti preferiti (★).
- **Lettura a lume di candela** — modalità notte, quattro colori per il libro, pensato prima di tutto per il telefono.
- **I ricordi restano vostri** — esportazione in PDF (vista di stampa), ZIP completo (testi + file) o JSON.

## Stack

| Parte | Tecnologie |
| --- | --- |
| Frontend (`/client`) | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Tiptap, react-dropzone, socket.io-client |
| Backend (`/server`) | Node.js 24, Express 5, TypeScript, Socket.io, PostgreSQL (`pg`), multer, zod |
| Deploy | Docker multi-stage, fly.io (app + Postgres + volume), GitHub Actions |

```
client/               frontend React
  src/components/     libro sfogliabile (book/), copertina (cover/), editor, media, decorazioni disegnate a mano
  src/context/        sessione (libro, chi scrive, notte) e tempo reale (socket, pagine, notifiche)
  src/pages/          benvenuto, creazione, accesso, libro, editor, copertina, ricordi, impostazioni, stampa
server/               API Express + Socket.io
  migrations/         schema SQL, applicato automaticamente all'avvio
  src/routes/         libri e accesso, copertina, pagine, media, esportazione
  src/realtime/       presenza, "sta scrivendo", lock di modifica
  test/               test di integrazione (vitest + supertest) su un PostgreSQL vero
scripts/dev.mjs       avvio di sviluppo (database + server + client)
Dockerfile, fly.toml, docker-compose.yml, .env.example
```

## Avvio in locale

Serve **Node.js 20+** (consigliato 24). Docker è facoltativo.

```bash
npm run setup     # installa le dipendenze di server e client
npm run dev       # PostgreSQL integrato + API (porta 3000) + frontend (http://localhost:5173)
```

`npm run dev` avvia da solo un PostgreSQL locale (pacchetto `embedded-postgres`, UTF-8, dati in
`~/.il-nostro-libro/pgdata`): non serve installare nulla. Le migrazioni partono all'avvio del server.

Se preferisci Docker:

```bash
docker compose up db          # solo PostgreSQL, poi:  npm run dev -- --no-db
docker compose up --build     # tutta la app come in produzione, su http://localhost:3000
```

Altri comandi utili:

| Comando | Cosa fa |
| --- | --- |
| `npm test` | test del server (avvia un PostgreSQL temporaneo, oppure usa `TEST_DATABASE_URL`) |
| `npm run typecheck` | controllo dei tipi di client e server |
| `npm run build` | build di produzione di client e server |
| `npm run preview` | frontend compilato servito da Express su una sola porta, come in produzione |
| `npm run migrate --prefix server` | applica le migrazioni a mano |

### Variabili d'ambiente

Per lo sviluppo i valori predefiniti bastano. Tutte le variabili sono descritte in [`.env.example`](.env.example).

| Variabile | Obbligatoria | Descrizione |
| --- | --- | --- |
| `DATABASE_URL` | in produzione | connessione PostgreSQL |
| `APP_SECRET` | in produzione | firma le sessioni e protegge le chiavi dei libri. **Non va più cambiato dopo il primo libro**: le chiavi smetterebbero di funzionare |
| `UPLOAD_DIR` | no | cartella dei file caricati (in produzione: il volume, `/data/uploads`) |
| `MAX_UPLOAD_MB` | no | dimensione massima di un file (predefinito 10) |
| `PORT` | no | porta del server (predefinito 3000) |

## Come funziona l'accesso

- Alla creazione la coppia sceglie una **chiave** (almeno 8 caratteri). Il server non la salva mai in chiaro:
  conserva solo un'impronta `scrypt` derivata con `APP_SECRET`. Maiuscole e spazi iniziali/finali non contano.
- Chi inserisce la chiave riceve un cookie di sessione `httpOnly` (JWT, 90 giorni). Anche i file caricati si
  leggono solo con quel cookie: non esistono link pubblici.
- Su ogni dispositivo si sceglie una volta "chi tiene in mano il libro": è la firma proposta per le pagine nuove
  (si cambia dalle impostazioni o direttamente nell'editor).
- I tentativi di accesso sono limitati (12 errori ogni 15 minuti per indirizzo IP). La chiave non si può
  recuperare: chi la perde non può più aprire il libro.

## API REST

Tutte le rotte stanno sotto `/api`, parlano JSON e rispondono agli errori con `{ "error": "messaggio" }`.
Tranne le prime due, richiedono il cookie di sessione.

| Metodo e percorso | Descrizione |
| --- | --- |
| `POST /books` | crea un libro: `{ coupleName, partnerOne, partnerTwo, startDate, theme, code }` e apre la sessione |
| `POST /auth/login` | apre il libro con la chiave: `{ code }` |
| `POST /auth/logout` | chiude la sessione |
| `GET /book` · `PATCH /book` | legge o aggiorna titolo, nomi, data di inizio, tema (`rosa`, `bordeaux`, `oro`, `pesca`) |
| `PUT /book/cover` | salva la copertina: `{ background, items: [...] }` (vedi sotto) |
| `GET /entries` | pagine in ordine di libro. Filtri: `q` (testo), `tag`, `favorite=1`, `order=asc\|desc` |
| `GET /entries/:id` | una pagina |
| `POST /entries` · `PUT /entries/:id` | crea o salva: `{ date, title, tag, contentHtml, author, isFavorite, media: [{ id, caption }] }` |
| `PATCH /entries/:id/favorite` | `{ isFavorite }` |
| `DELETE /entries/:id` | elimina la pagina e i suoi file |
| `POST /media` | carica un file (`multipart/form-data`, campo `file`). Il tipo è riconosciuto dal contenuto |
| `POST /media/embed` | aggiunge un link: `{ url }` (YouTube, Spotify, Giphy, Tenor) |
| `GET /media/:id/file` | il file caricato (supporta `Range` per i video) |
| `DELETE /media/:id` | elimina un contenuto non ancora legato a una pagina |
| `GET /export/json` · `GET /export/zip` | copia dei testi, oppure testi + file |
| `GET /health` | stato del servizio e del database |

Codici particolari: `401` sessione mancante, `409` chiave già usata, `413` file troppo grande,
`415` tipo di file non ammesso, `423` pagina in modifica da parte del partner (`lockedBy`).
L'HTML delle pagine viene sempre ripulito sul server (solo `p`, `strong`, `em`, elenchi, citazioni).

### La copertina

`book.cover` è `null` finché non viene personalizzata (il client mostra quella predefinita). Altrimenti contiene lo
sfondo (`tema`, `carta`, `kraft`, `cipria`, `notte`) e fino a 40 elementi. Ogni elemento ha `id`, centro `x`/`y` e
larghezza `w` in percentuale della copertina (proporzione fissa 3:4), rotazione `rot` in gradi, ordine `z`, e un `type`:

| `type` | Campi propri |
| --- | --- |
| `title` | nessuno: mostra titolo del libro e data di inizio |
| `photo` | `mediaId` (foto o GIF caricata con `POST /media`), `frame`: `polaroid` o `nessuna` |
| `video` | `mediaId` (video MP4 caricato) |
| `note` | `text`, `color`: `giallo`, `rosa`, `azzurro`, `verde` |
| `text` | `text`, `font`: `mano` o `stampa`, `color`: `inchiostro`, `chiaro`, `accento`, `oro` |
| `sticker` | `sticker`: `cuore`, `stella`, `fiore`, `rametto` oppure un'emoji |

I file usati in copertina sono marcati `media.on_cover`: non vengono ripuliti come caricamenti orfani, non possono
finire dentro una pagina e vengono eliminati quando escono dalla copertina.

### Eventi in tempo reale (Socket.io)

La connessione usa lo stesso cookie di sessione, più `auth: { author, clientId }`.

| Evento | Direzione | Significato |
| --- | --- | --- |
| `presence` | server → client | chi ha il libro aperto |
| `writing` / `partner:writing` | client → server → partner | qualcuno sta scrivendo (`entryId` nullo = pagina nuova) |
| `lock:acquire`, `lock:heartbeat`, `lock:release` | client → server | riserva una pagina mentre è aperta nell'editor (scade dopo 45 s senza segnali) |
| `lock:changed` | server → client | una pagina è stata riservata o liberata |
| `entry:created`, `entry:updated`, `entry:deleted`, `book:updated` | server → client | il libro è cambiato |

## Database

Tre tabelle (vedi [`server/migrations/`](server/migrations)):
`books` (il libro, l'impronta della chiave e la copertina in `jsonb`), `entries` (le pagine, con una copia solo testo per la ricerca) e
`media` (file caricati e link esterni, ordinati dentro la pagina).

Per cambiare lo schema aggiungi un file `server/migrations/00N_nome.sql`: all'avvio il server applica in ordine,
ciascuno in una transazione, quelli non ancora registrati nella tabella `schema_migrations`.

## Deploy su fly.io

L'immagine Docker contiene il server Express che serve anche il frontend compilato: una sola app, una sola porta.
fly.io fornisce HTTPS automatico su `https://<app>.fly.dev`.

```bash
# 1. App (il nome deve essere unico: se cambia, aggiorna "app" in fly.toml)
fly apps create il-nostro-libro

# 2. PostgreSQL: una macchina piccola, collegata alla app (imposta da solo il segreto DATABASE_URL)
fly postgres create --name il-nostro-libro-db --region fra \
  --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
fly postgres attach il-nostro-libro-db --app il-nostro-libro

# 3. Segreto della app (una volta sola: poi non va più cambiato)
fly secrets set --app il-nostro-libro \
  APP_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"

# 4. Deploy: crea anche il volume "libro_data" (1 GB) montato su /data per i file caricati
fly deploy --ha=false
```

Note sui costi: fly.io non ha più un piano gratuito vero e proprio, si paga a consumo. Con questa configurazione
(macchina `shared-cpu-1x` da 512 MB che si ferma quando nessuno ha il libro aperto, Postgres su una macchina
piccola, 2 GB di volumi in tutto) la spesa è di pochi dollari al mese. Controlla sempre i prezzi aggiornati.

### Deploy automatico da GitHub

Il workflow [`.github/workflows/ci-deploy.yml`](.github/workflows/ci-deploy.yml) esegue test e build a ogni push
e pull request; sui push a `main`, se i test passano, pubblica su fly.io. Il deploy si attiva aggiungendo al
repository il segreto `FLY_API_TOKEN` (finché manca, quel passaggio viene saltato):

```bash
fly tokens create deploy --app il-nostro-libro | gh secret set FLY_API_TOKEN
```

### Scalare

- **Più memoria o CPU**: `fly scale memory 1024` oppure `fly scale vm shared-cpu-2x`.
- **Più spazio per i file**: `fly volumes extend <id> --size 5`.
- **Più macchine**: oggi la app è pensata per **una sola istanza**, perché presenza e lock di modifica vivono in
  memoria e i file stanno su un volume locale. Per andare oltre servono l'adapter Redis di Socket.io, i lock su
  Redis o Postgres e uno storage a oggetti (es. Tigris/S3) al posto del volume.

### Backup

- Dalle impostazioni del libro: **Copia completa (ZIP)** scarica `libro.json` e tutti i file caricati.
- Lato infrastruttura: fly.io conserva snapshot giornalieri dei volumi (`fly volumes snapshots list <id>`);
  per il database, `fly postgres connect` e `pg_dump`, oppure `fly postgres create --enable-backups`.

## Sicurezza e privacy

- Chiave mai salvata in chiaro, sessioni in cookie `httpOnly` + `SameSite=Lax` (`Secure` in produzione).
- Ogni query è filtrata per libro: una coppia non può leggere pagine o file di un'altra (coperto dai test).
- Upload: limite di dimensione, tipo riconosciuto dai primi byte del file, nomi su disco casuali.
- HTML ripulito sul server, Content-Security-Policy restrittiva (iframe solo da YouTube e Spotify).
- Chiunque conosca la chiave può leggere e scrivere: sceglietela lunga e non riutilizzatela altrove.

## Idee per il futuro

- Miniature generate sul server per le foto più pesanti e conversione dei video `.mov`.
- Notifiche push ("Anna ha scritto una pagina") e promemoria per gli anniversari.
- Pagine lunghe impaginate su più fogli invece dello scorrimento interno.
- Cambio della chiave e seconda chiave di sola lettura per condividere il libro.
- PDF generato dal server, con l'impaginazione del libro.
