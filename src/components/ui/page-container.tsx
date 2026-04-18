import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** Wider dashboard shell */
  wide?: boolean;
};

const base =
  "mx-auto w-full px-4 sm:px-5 max-w-3xl";

const wideClass = "max-w-5xl";

export function PageContainer({
  children,
  className = "",
  wide = false,
}: PageContainerProps) {
  return (
    <div className={`${base} ${wide ? wideClass : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
