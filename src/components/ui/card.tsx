import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  as?: "div" | "article" | "section";
};

export function Card({
  children,
  className = "",
  as: Component = "div",
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
