import type { ButtonHTMLAttributes, ReactNode } from "react";
import { STATUS_META } from "../lib/meta";
import type { Status } from "../lib/types";

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

type Variant = "primary" | "outline" | "ghost" | "success";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  outline: "bg-transparent text-fg-2 ring-1 ring-inset ring-line-strong hover:bg-hover hover:text-fg",
  ghost: "text-muted hover:bg-hover hover:text-fg",
  success: "bg-[#16241B] text-[#8BE3A3] ring-1 ring-inset ring-[#24432E] hover:bg-[#1A2D21]",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft disabled:cursor-default disabled:opacity-45",
        size === "lg" ? "h-11 px-4 text-sm" : size === "md" ? "h-10 px-3.5 text-sm" : "h-8 px-2.5 text-[13px]",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Pill({ className, style, children }: { className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <span
      style={style}
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11px] font-semibold leading-[18px]", className)}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status, upper }: { status: Status; upper?: boolean }) {
  const s = STATUS_META[status];
  return (
    <Pill style={{ background: s.soft, color: s.ink }} className={upper ? "font-bold uppercase tracking-wide" : ""}>
      {s.label}
    </Pill>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle">{children}</h3>
      {action}
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#3D6BFF" />
        {/* planta desenrolada: o rolo à esquerda e a folha com duas caixas */}
        <rect x="9" y="8" width="17" height="16" rx="1.5" fill="white" opacity=".92" />
        <circle cx="9" cy="16" r="4" fill="#3D6BFF" stroke="white" strokeWidth="2" />
        <rect x="15" y="11" width="4.5" height="4.5" rx="1" fill="#3D6BFF" />
        <rect x="19" y="17" width="4.5" height="4.5" rx="1" fill="#3D6BFF" opacity=".6" />
      </svg>
      <span className="text-[15px] font-bold tracking-tight text-fg">Blueroll</span>
    </div>
  );
}

/** Cartão flutuante sobre o canvas (breadcrumb, toolbar, legenda). */
export const floating = "rounded-xl bg-raised/95 ring-1 ring-[#222A39] backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,.35)]";
