import { BookHeart, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Divider, FloatingDecor, FlowerDoodle, HeartDoodle, StarDoodle } from '../components/Decor';

const STEPS = [
  {
    icon: HeartDoodle,
    title: 'Date un nome alla vostra storia',
    text: 'Scegliete un titolo, il giorno in cui tutto è cominciato e una chiave segreta, soltanto vostra.',
  },
  {
    icon: FlowerDoodle,
    title: 'Scrivete una pagina alla volta',
    text: 'Una giornata qualunque, un pensiero, un momento difficile o bellissimo. Con una foto, una canzone, un video.',
  },
  {
    icon: StarDoodle,
    title: 'Sfogliatelo insieme',
    text: 'Pagina dopo pagina, come un libro vero. Per ricordarvi quanta strada avete già fatto, mano nella mano.',
  },
];

/** Prima visita: che cos’è il libro e come si comincia. */
export function Welcome() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <FloatingDecor />
      <main className="relative w-full max-w-3xl text-center">
        <HeartDoodle className="mx-auto w-14 text-accent" />
        <h1 className="mt-3 text-6xl font-semibold italic leading-none text-accent-deep sm:text-7xl">Il Nostro Libro</h1>
        <p className="mt-3 font-hand text-3xl text-ink-soft sm:text-4xl">scritto a quattro mani, una pagina alla volta</p>
        <Divider className="my-6" />
        <p className="mx-auto max-w-xl text-xl leading-relaxed">
          Le giornate qualunque, i pensieri della sera, le difficoltà attraversate insieme, i momenti che vorreste non
          finissero mai. Il tempo trasforma i momenti in ricordi: questo libro li custodisce per voi.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/nuovo" className="btn btn-primary px-7 text-xl">
            <BookHeart size={20} aria-hidden />
            Iniziate il vostro libro
          </Link>
          <Link to="/entra" className="btn btn-soft px-7 text-xl">
            <KeyRound size={19} aria-hidden />
            Abbiamo già un libro
          </Link>
        </div>

        <ol className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card rounded-2xl px-5 py-5 shadow-none">
              <div className="flex items-center gap-3">
                <Icon className="h-9 w-9 flex-none text-accent" />
                <span className="font-hand text-3xl text-gold">{i + 1}.</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold leading-snug text-accent-deep">{title}</h2>
              <p className="mt-1 text-[1.02rem] leading-snug text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[0.95rem] italic text-ink-soft">
          Nessun account, nessuna email: il libro si apre soltanto con la vostra chiave.
        </p>
      </main>
    </div>
  );
}
