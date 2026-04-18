import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 active:opacity-95",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost:
    "text-muted hover:bg-surface-muted hover:text-foreground",
  danger:
    "bg-danger-muted text-danger hover:opacity-90 dark:bg-zinc-800 dark:text-red-300",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
