import { teamLogoUrl } from "@/lib/nba/team-logos";
import Image from "next/image";

type TeamLogoProps = {
  abbrev: string;
  size?: number;
  className?: string;
};

export function TeamLogo({ abbrev, size = 32, className = "" }: TeamLogoProps) {
  const src = teamLogoUrl(abbrev);
  const label = abbrev.trim().toUpperCase();

  if (!src) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md border border-border bg-surface-muted text-xs font-semibold text-muted ${className}`.trim()}
        style={{ width: size, height: size }}
        title={label}
      >
        {label.slice(0, 3)}
      </span>
    );
  }

  const remote = src.startsWith("http");
  const dim = { width: size, height: size };

  const alt = `${label} logo`;

  if (remote) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`object-contain ${className}`.trim()}
        unoptimized={src.endsWith(".gif")}
        title={label}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      {...dim}
      className={`object-contain ${className}`.trim()}
      title={label}
    />
  );
}
