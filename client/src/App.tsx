import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { Toasts } from './components/Toasts';
import { useSession } from './context/Session';
import { BookView, Loading } from './pages/BookView';
import { Welcome } from './pages/Welcome';
import { WhoAreYou } from './pages/WhoAreYou';

// Il libro si apre subito; il resto (editor compreso, la parte più pesante) arriva quando serve.
const CreateBook = lazy(() => import('./pages/CreateBook').then((m) => ({ default: m.CreateBook })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Editor = lazy(() => import('./pages/Editor').then((m) => ({ default: m.Editor })));
const CoverEditor = lazy(() => import('./pages/CoverEditor').then((m) => ({ default: m.CoverEditor })));
const Memories = lazy(() => import('./pages/Memories').then((m) => ({ default: m.Memories })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const PrintView = lazy(() => import('./pages/PrintView').then((m) => ({ default: m.PrintView })));

const Splash = () => (
  <div className="flex min-h-dvh">
    <Loading text="Un momento…" />
  </div>
);

/** Schermate che esistono solo prima di aprire un libro. */
function BeforeTheBook() {
  const { book } = useSession();
  if (book === undefined) return <Splash />;
  return book ? <Navigate to="/libro" replace /> : <Outlet />;
}

/** Schermate a libro aperto: servono la chiave e la scelta di chi scrive. */
function InsideTheBook() {
  const { book, author } = useSession();
  if (book === undefined) return <Splash />;
  if (!book) return <Navigate to="/" replace />;
  return author ? <Outlet /> : <WhoAreYou />;
}

// La chiave rimonta la pagina di scrittura passando da un ricordo a un altro.
function EditorRoute() {
  const { id } = useParams();
  return <Editor key={id ?? 'nuova'} />;
}

export function App() {
  return (
    <>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route element={<BeforeTheBook />}>
            <Route path="/" element={<Welcome />} />
            <Route path="/nuovo" element={<CreateBook />} />
            <Route path="/entra" element={<Login />} />
          </Route>
          <Route element={<InsideTheBook />}>
            <Route path="/libro" element={<BookView />} />
            <Route path="/scrivi" element={<EditorRoute />} />
            <Route path="/scrivi/:id" element={<EditorRoute />} />
            <Route path="/copertina" element={<CoverEditor />} />
            <Route path="/ricordi" element={<Memories />} />
            <Route path="/impostazioni" element={<Settings />} />
            <Route path="/stampa" element={<PrintView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toasts />
    </>
  );
}
