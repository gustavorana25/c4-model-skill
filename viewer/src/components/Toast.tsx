import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { cn } from "./ui";

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-line-strong bg-chip px-4 py-2.5 text-[13px] text-fg shadow-[0_12px_32px_rgba(0,0,0,.5)] transition duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <CheckCircle2 size={15} className="text-st-new-ink" />
      {toast?.msg}
    </div>
  );
}
