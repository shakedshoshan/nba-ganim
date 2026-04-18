import Image from "next/image";
import Link from "next/link";

type SiteLogoProps = {
  href?: string;
  className?: string;
  /** Width/height in px (square asset) */
  size?: number;
};

export function SiteLogo({
  href = "/",
  className = "",
  size = 36,
}: SiteLogoProps) {
  const img = (
    <Image
      src="/nba.png"
      alt="NBA Playoff Challenge"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`.trim()}
      priority
    />
  );

  if (!href) {
    return img;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {img}
    </Link>
  );
}
