import { AuthShell } from '../components/AuthShell';
import { useSession } from '../context/Session';

/** Su un dispositivo nuovo: chi dei due lo sta usando? Serve a firmare le pagine. */
export function WhoAreYou() {
  const { book, chooseAuthor } = useSession();
  if (!book) return null;
  return (
    <AuthShell title="Chi tiene in mano il libro?">
      <p className="-mt-2 mb-6 text-center text-ink-soft">
        Così ogni pagina porterà la firma giusta. Lo ricordiamo solo su questo dispositivo, e puoi cambiarlo quando vuoi.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[book.partnerOne, book.partnerTwo].map((name) => (
          <button key={name} type="button" className="btn btn-soft py-5 font-hand text-4xl" onClick={() => chooseAuthor(name)}>
            {name}
          </button>
        ))}
      </div>
    </AuthShell>
  );
}
