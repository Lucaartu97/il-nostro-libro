const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);

const longDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "14 febbraio 2024" */
export const formatDate = (iso: string) => longDate.format(toUtc(iso));
/** "mercoledì 14 febbraio 2024" */
export const formatFullDate = (iso: string) => `${weekday.format(toUtc(iso))} ${formatDate(iso)}`;
/** "febbraio 2024" */
export const formatMonth = (iso: string) => monthYear.format(toUtc(iso));
/** "14 feb 2024" */
export const formatShortDate = (iso: string) => shortDate.format(toUtc(iso));

/** La data di oggi nel fuso di chi scrive, come YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Giorni trascorsi dalla data di inizio (0 se è oggi o nel futuro). */
export function daysTogether(startDate: string): number {
  return Math.max(0, Math.round((toUtc(todayIso()).getTime() - toUtc(startDate).getTime()) / DAY_MS));
}

export function togetherLabel(startDate: string): string {
  const days = daysTogether(startDate);
  if (days === 0) return 'la vostra storia comincia oggi';
  if (days === 1) return 'insieme da un giorno';
  return `insieme da ${days.toLocaleString('it-IT')} giorni`;
}

/** Testo semplice da un frammento HTML (per anteprime e bozze). */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html.replace(/<\/(p|li)>|<br\s*\/?>/gi, '$& '), 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
