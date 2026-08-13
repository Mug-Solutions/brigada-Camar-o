import type { DocLevel } from "@/lib/domain";

export function Chip({ level, label }: { level: DocLevel; label: string }) {
  return <span className={`chip chip--${level}`}>{label}</span>;
}
