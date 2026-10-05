import { tagInfo } from '../lib/tags';
import type { Tag } from '../lib/types';

export function TagBadge({ tag, className = '' }: { tag: Tag; className?: string }) {
  const { label, icon: Icon } = tagInfo(tag);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.82rem] font-bold tracking-wide text-accent-deep ${className}`}
    >
      <Icon size={13} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  );
}
