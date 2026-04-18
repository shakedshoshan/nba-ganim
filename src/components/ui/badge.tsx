import type { ReactNode } from "react";

export type BadgeTone = "open" | "locked" | "live" | "final" | "neutral";

const tones: Record<BadgeTone, string> = {
  open: "bg-success-bg text-success-fg",
  locked: "bg-info-bg text-info-fg",
  live: "bg-success-bg text-success-fg",
  final: "bg-surface-muted text-muted border border-border",
  neutral: "bg-surface-muted text-muted border border-border",
};

type BadgeProps = {
  tone: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone, icon, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`.trim()}
    >
      {icon ? <span className="shrink-0" aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full bg-current ${className ?? ""}`.trim()}
      aria-hidden
    />
  );
}

export function OpenBadge() {
  return (
    <Badge tone="open" icon={<Dot />}>
      Open
    </Badge>
  );
}

export function LockedBadge() {
  return (
    <Badge tone="locked" icon={<Dot className="opacity-70" />}>
      Locked
    </Badge>
  );
}

export function LiveBadge() {
  return (
    <Badge tone="live" icon={<Dot />}>
      Live
    </Badge>
  );
}

export function FinalBadge() {
  return <Badge tone="final">Final</Badge>;
}
