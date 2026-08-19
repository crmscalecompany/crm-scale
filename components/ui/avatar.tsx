import Image from "next/image";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-rose-500/25 text-rose-200",
  "bg-amber-500/25 text-amber-200",
  "bg-emerald-500/25 text-emerald-200",
  "bg-sky-500/25 text-sky-200",
  "bg-violet-500/25 text-violet-200",
  "bg-fuchsia-500/25 text-fuchsia-200",
];

// Deterministic (name-based, not random) so the same person always gets the
// same color across renders/reloads.
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

// Photo when available, otherwise a color-coded circle with the person's
// initials — used everywhere a person (SDR/Closer/etc.) is displayed, per
// explicit user request, rather than a bare name string.
export function Avatar({ name, src, size = 20, className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", colorFor(name), className)}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}

// Avatar + name, the common pairing (table cells, cards, pickers).
export function PersonInline({ name, src, size = 20, className }: AvatarProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Avatar name={name} src={src} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
