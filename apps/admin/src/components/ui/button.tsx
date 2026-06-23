import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "discord" | "success" | "danger" | "gold";

const variants: Record<Variant, string> = {
  primary:
    "bg-btn-primary text-white shadow-glow hover:brightness-110 ring-1 ring-cc-blue/50",
  secondary:
    "glass-strong text-white/80 hover:bg-white/[0.08] hover:text-white ring-1 ring-white/10",
  ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white",
  discord: "bg-[#5865F2] text-white hover:bg-[#4752C4] ring-1 ring-[#5865F2]/50",
  success: "bg-cc-green/20 text-cc-green ring-1 ring-cc-green/40 hover:bg-cc-green/30",
  danger: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25",
  gold: "bg-cc-gold/15 text-cc-gold ring-1 ring-cc-gold/40 hover:bg-cc-gold/25",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
