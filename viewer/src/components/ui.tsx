import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useT } from "../i18n";
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
  const t = useT();
  return (
    <Pill style={{ background: s.soft, color: s.ink }} className={upper ? "font-bold uppercase tracking-wide" : ""}>
      {t(`status.${status}`)}
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
      {/* "Níveis abertos" (brand/blueroll-mark.svg): caixas aninhadas com uma abertura para o nível de dentro */}
      <svg viewBox="0 0 64 64" className="size-7 shrink-0" aria-hidden="true">
        <g fill="none" stroke="#3D6BFF" strokeWidth="6">
          <rect x="8" y="8" width="48" height="48" rx="8" />
          <path d="M28 20H40Q44 20 44 24V40Q44 44 40 44H24Q20 44 20 40V30" />
        </g>
        <rect x="28" y="28" width="8" height="8" rx="2" fill="#6E9BFF" />
      </svg>
      <span className="text-[15px] font-bold tracking-tight text-fg">Blueroll</span>
    </div>
  );
}

/** Cartão flutuante sobre o canvas (breadcrumb, toolbar, legenda). */
export const floating = "rounded-xl bg-raised/95 ring-1 ring-[#222A39] backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,.35)]";
