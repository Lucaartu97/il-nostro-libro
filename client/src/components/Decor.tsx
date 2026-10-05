// Piccole illustrazioni disegnate a mano: cuori, fiori, stelle, rametti.
import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const pen = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function HeartDoodle(props: Props) {
  return (
    <svg viewBox="0 0 48 44" {...pen} {...props}>
      <path d="M24 39.5C13.5 31.8 5.2 24.6 4.6 15.6 4.1 8.9 9 4.4 14.6 4.8c4.3.3 7.6 3.1 9.4 6.9 1.5-4.2 5-7.1 9.6-7.3 5.7-.2 10.3 4.5 9.8 11.100C42.700 24.600 34.200 31.600 24 39.500Z" />
      <path d="M10.800 14.200c.7-2.300 2.200-3.700 4.100-4.200" opacity="0.55" />
    </svg>
  );
}

export function StarDoodle(props: Props) {
  return (
    <svg viewBox="0 0 48 48" {...pen} {...props}>
      <path d="M24 5.500l5.300 12.100 13.200 1.300-10 8.900 3 13L24 34l-11.600 6.700 3.300-12.900L5.500 18.700l13.300-1Z" />
      <path d="M40 6v5M37.500 8.500h5M7 36v4M5 38h4" opacity="0.6" />
    </svg>
  );
}

export function FlowerDoodle(props: Props) {
  const petal = 'M24 20c-4.200-3.200-6.300-9-3.200-13.200 2.100-2.600 5.400-1.300 5.900 2 .6 4.100-.6 8.200-2.700 11.200Z';
  return (
    <svg viewBox="0 0 48 64" {...pen} {...props}>
      {[0, 70, 145, 215, 290].map((angle) => (
        <path key={angle} d={petal} transform={`rotate(${angle} 24 20)`} />
      ))}
      <circle cx="24" cy="20" r="2.600" fill="currentColor" stroke="none" opacity="0.7" />
      <path d="M24.500 31c1 10-1 20-4.500 30" />
      <path d="M22.500 46c5-5.500 11-5.500 14.500-2-3 5.500-9.500 6.500-14.500 2Z" />
    </svg>
  );
}

export function SprigDoodle(props: Props) {
  return (
    <svg viewBox="0 0 48 64" {...pen} {...props}>
      <path d="M6 59C13 44 22 28 42 7" />
      <path d="M15 43c-6-1-9-5-9-9.500 5 .5 9 3.500 9 9.500Z" />
      <path d="M20 35c1-6 5-9 10.500-9 0 5.500-4.500 9-10.500 9Z" />
      <path d="M26 26.500c-6-2-8-6-7-10.500 5 1 8 5.500 7 10.500Z" />
      <path d="M31 20c2-6 6-8 11.500-7-1 5-5.500 8-11.500 7Z" />
      <path d="M37 12.500c-4-3-5-7-3-10.500 4 2 5.500 6 3 10.500Z" />
    </svg>
  );
}

/** Riga ondulata con un cuoricino al centro. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 24" {...pen} className={`mx-auto h-5 w-44 text-accent ${className}`}>
      <path d="M6 12c16-8 28 8 46 0s30-8 44 0" opacity="0.7" />
      <path d="M120 19.500c-6-4.500-9-7.500-9-11.200 0-2.500 2-4.300 4.200-4.300 1.900 0 3.700 1.100 4.800 3 1.100-1.900 2.900-3 4.800-3 2.200 0 4.200 1.800 4.200 4.300 0 3.700-3 6.700-9 11.200Z" />
      <path d="M144 12c14-8 26 8 44 0s30-8 46 0" opacity="0.7" />
    </svg>
  );
}

/** Decorazioni sparse ai bordi delle schermate di benvenuto. */
export function FloatingDecor() {
  const item = 'absolute animate-float';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <HeartDoodle className={`${item} left-[6%] top-[9%] w-10 text-accent/50 [--tilt:-12deg]`} />
      <StarDoodle className={`${item} right-[9%] top-[14%] w-9 text-gold/60 [--tilt:10deg] [animation-delay:-2s]`} />
      <FlowerDoodle className={`${item} bottom-[8%] left-[10%] w-11 text-accent/45 [--tilt:8deg] [animation-delay:-4s]`} />
      <SprigDoodle className={`${item} bottom-[12%] right-[7%] w-11 text-gold/50 [--tilt:-6deg] [animation-delay:-1s]`} />
      <HeartDoodle className={`${item} right-[22%] bottom-[30%] hidden w-6 text-accent/35 md:block [--tilt:14deg] [animation-delay:-5s]`} />
      <StarDoodle className={`${item} left-[20%] top-[38%] hidden w-6 text-gold/40 md:block [--tilt:-8deg] [animation-delay:-3s]`} />
    </div>
  );
}
