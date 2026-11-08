import { ArrowRight, Waypoints } from "lucide-react";
import { computeView } from "../../lib/view";
import { useT } from "../../i18n";
import { useStore } from "../../store";
import { SectionTitle } from "../ui";
import { RelationItem } from "./ElementDetails";

export function EdgeDetails({ id }: { id: string }) {
  const doc = useStore((s) => s.doc)!;
  const model = useStore((s) => s.model)!;
  const focus = useStore((s) => s.focus);
  const t = useT();
  const e = computeView(doc, model, focus).edges.find((x) => x.id === id);
  if (!e) return null;
  const from = model.index.get(e.from)!;
  const to = model.index.get(e.to)!;
  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <div className="flex items-center gap-1.5 text-[12px] text-subtle">
          <Waypoints size={13} /> {t("side.relation")}
        </div>
        <h2 className="mt-1 flex flex-wrap items-center gap-1.5 text-lg font-semibold text-fg">
          {from.name} <ArrowRight size={16} className="text-subtle" /> {to.name}
        </h2>
        {e.rels.length > 1 && (
          <p className="mt-2 text-[13px] text-muted">{t("side.aggregated", e.rels.length)}</p>
        )}
      </div>
      <section>
        <SectionTitle>{e.rels.length > 1 ? t("side.relations") : t("side.details")}</SectionTitle>
        <ul className="flex flex-col gap-1.5">
          {e.rels.map((r, i) => (
            <RelationItem key={i} r={r} model={model} />
          ))}
        </ul>
      </section>
    </div>
  );
}
