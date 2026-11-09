#!/usr/bin/env python3
"""Blueroll — converte arch.yaml <-> URL do viewer.

Dois tipos de documento (campo kind):
  plan    (padrão) o que um plano cria, altera e remove, com steps e aprovação
  system  o sistema como é hoje: documentação, onboarding (tudo inalterado, sem steps)

O vocabulário de tipos vem de notation (c4, processo, infra, dominio, jornada, livre; presets em
schema/notations.json) mais os types próprios do documento. Sem notation, é c4.

O idioma das mensagens e do brief vem de lang (pt-BR, en, es; padrão pt-BR). Os rótulos dos
tipos do preset saem traduzidos (schema/notations.i18n.json); os types próprios ficam como estão.

Uso:
  arch_url.py validate <arquivo.yaml|json>
  arch_url.py encode   <arquivo.yaml|json> [--base URL | --local] [--embed]
  arch_url.py decode   <url|#hash|payload> [-o saida.yaml] [--json]
  arch_url.py brief    <arquivo.yaml|url> [-o saida.md]

Formato do hash:  #v1.<base64url(deflate-raw(json minificado))>[~<id da view>]

Só usa biblioteca padrão. PyYAML é necessário para ler/escrever YAML
(JSON funciona sem ele). jsonschema é opcional: se instalado, valida
também contra schema/arch.v1.json.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from messages import DEFAULT_LANG, LANGS, lang_of, msg  # noqa: E402

VERSION = 1
PREFIX = f"v{VERSION}."
ROOT = Path(__file__).resolve().parent.parent  # pasta da skill
SCHEMA_PATH = ROOT / "schema" / "arch.v1.json"
# build local do viewer; só existe num clone do repositório (skills/blueroll/ -> raiz)
VIEWER_PATH = ROOT.parent.parent / "viewer" / "dist" / "index.html"
# versão publicada pelo workflow do GitHub Pages (.github/workflows/pages.yml)
PUBLIC_VIEWER_URL = "https://gustavorana25.github.io/c4-model-skill/"

NOTATIONS_PATH = ROOT / "schema" / "notations.json"
NOTATIONS_I18N_PATH = ROOT / "schema" / "notations.i18n.json"

KINDS = {"plan", "system"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
STATUSES = {"new", "changed", "removed", "unchanged"}
DEFAULT_NOTATION = "c4"
_PRESETS: dict | None = None
_I18N: dict | None = None


def presets() -> dict:
    """notations.json inteiro (cores, ícones e notações); lido uma vez."""
    global _PRESETS
    if _PRESETS is None:
        _PRESETS = json.loads(NOTATIONS_PATH.read_text(encoding="utf-8"))
    return _PRESETS


def preset_texts(lang: str, name: str) -> dict:
    """Textos traduzidos de um preset (vazio em pt-BR, que é o próprio notations.json)."""
    global _I18N
    if lang == DEFAULT_LANG:
        return {}
    if _I18N is None:
        _I18N = json.loads(NOTATIONS_I18N_PATH.read_text(encoding="utf-8"))
    return _I18N.get(lang, {}).get(name, {})


def load_notation(doc: dict) -> dict:
    """Vocabulário do documento: o preset de `notation` (c4 por padrão) mais os `types` próprios.
    Um tipo próprio com o mesmo id de um tipo do preset substitui o do preset.
    Devolve {name, root, types: {id: {...}}}; cada tipo tem parents como set (None = raiz, "*" = qualquer lugar)."""
    name = doc.get("notation") or DEFAULT_NOTATION if isinstance(doc, dict) else DEFAULT_NOTATION
    base = presets()["notations"].get(name) or presets()["notations"][DEFAULT_NOTATION]
    tr = preset_texts(lang_of(doc), name if name in presets()["notations"] else DEFAULT_NOTATION).get("types", {})
    types = {k: {**v, **tr.get(k, {})} for k, v in base["types"].items()}
    for t in (doc.get("types") or []) if isinstance(doc, dict) else []:
        if isinstance(t, dict) and isinstance(t.get("id"), str):
            types[t["id"]] = {k: v for k, v in t.items() if k != "id"}
    for t in types.values():
        t["parents"] = set(t.get("parents") or ["*"])
    return {"name": name, "root": base.get("root"), "types": types}


def type_label(notation: dict, etype: str) -> str:
    t = notation["types"].get(etype)
    return t["label"].lower() if t else etype


# --------------------------------------------------------------------------- io

def load(path: str) -> dict:
    text = Path(path).read_text(encoding="utf-8")
    if path.endswith(".json"):
        return json.loads(text)
    try:
        import yaml  # type: ignore
    except ImportError:
        sys.exit("erro: PyYAML não instalado (pip install pyyaml) — ou use um arquivo .json")
    return yaml.safe_load(text)


def dump_yaml(doc: dict) -> str:
    try:
        import yaml  # type: ignore
    except ImportError:
        sys.exit("erro: PyYAML não instalado (pip install pyyaml) — ou use --json")
    return yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=100)


# --------------------------------------------------------------------- validate

def validate(doc) -> tuple[list[str], list[str]]:
    """Retorna (erros, avisos). Erros impedem gerar a URL."""
    errors: list[str] = []
    warnings: list[str] = []
    L = lang_of(doc)

    def m(key: str, **kw) -> str:
        return msg(L, key, **kw)

    if not isinstance(doc, dict):
        return [m("not_object")], []

    # 1. estrutura via JSON Schema (se disponível)
    try:
        import jsonschema  # type: ignore

        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        validator = jsonschema.Draft202012Validator(schema)
        for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
            loc = "/".join(str(p) for p in e.path) or m("root")
            errors.append(f"{loc}: {e.message}")
        if errors:
            return errors, warnings  # checagens semânticas assumem estrutura válida
    except ImportError:
        warnings.append(m("no_jsonschema"))

    # 2. checagens estruturais mínimas (sempre) + semânticas
    if doc.get("version") != VERSION:
        errors.append(m("version", v=VERSION))
    kind = doc.get("kind", "plan")
    if kind not in KINDS:
        errors.append(m("kind", kind=kind))
    if not title_of(doc).strip():
        errors.append(m("title"))
    if "lang" in doc and doc["lang"] not in LANGS:
        errors.append(m("lang", lang=doc["lang"], opts=", ".join(LANGS)))
    is_system = kind == "system"
    note = doc.get("notation", DEFAULT_NOTATION)
    if note not in presets()["notations"]:
        errors.append(m("notation", note=note, opts=", ".join(presets()["notations"])))
    notation = load_notation(doc)
    types = notation["types"]
    for i, t in enumerate(doc.get("types") or []):
        if not isinstance(t, dict):
            errors.append(m("must_object", p=f"types[{i}]"))
            continue
        tid = t.get("id")
        for par in t.get("parents") or []:
            if par not in (None, "*") and par not in types:
                errors.append(m("type_parent", tid=tid, par=par))
        if t.get("icon") and t["icon"] not in presets()["icons"]:
            warnings.append(m("type_icon", tid=tid, icon=t["icon"]))
        color = t.get("color")
        if color and color not in presets()["colors"] and not re.match(r"^#[0-9a-fA-F]{6}$", color):
            errors.append(m("type_color", tid=tid, color=color))
    if is_system:
        if doc.get("steps"):
            warnings.append(m("sys_steps"))
        if "approved" in doc:
            warnings.append(m("sys_approved"))
        if "plan" in doc and "title" not in doc:
            warnings.append(m("sys_plan"))

    elements: dict[str, dict] = {}
    parent_of: dict[str, str | None] = {}

    def walk(items, parent: dict | None, path: str):
        if not isinstance(items, list):
            errors.append(m("must_list", p=path))
            return
        for i, el in enumerate(items):
            p = f"{path}[{i}]"
            if not isinstance(el, dict):
                errors.append(m("must_object", p=p))
                continue
            eid, etype = el.get("id"), el.get("type")
            p = f"{p}({eid})"
            if not isinstance(eid, str) or not ID_RE.match(eid):
                errors.append(m("bad_id", p=p))
                continue
            if eid in elements:
                errors.append(m("dup_id", p=p))
                continue
            if etype not in types:
                errors.append(m("bad_type", p=p, etype=etype, notation=notation["name"], opts=", ".join(types)))
            if not el.get("name"):
                errors.append(m("no_name", p=p))
            if el.get("status", "unchanged") not in STATUSES:
                errors.append(m("bad_status", p=p, status=el.get("status")))
            if is_system and el.get("status", "unchanged") != "unchanged":
                warnings.append(m("sys_status", p=p, status=el["status"]))
            if "detail" in el:
                warnings.append(m("old_detail", p=p))

            ptype = parent.get("type") if parent else None
            allowed = types[etype]["parents"] if etype in types else {"*"}
            if "*" not in allowed and ptype not in allowed:
                where = m("inside", ptype=ptype) if ptype else m("at_root")
                ok = ", ".join(sorted(m("root_word") if a is None else a for a in allowed))
                errors.append(m("bad_parent", p=p, etype=etype, where=where, ok=ok))

            elements[eid] = el
            parent_of[eid] = parent["id"] if parent else None
            if "children" in el:
                walk(el["children"], el, f"{p}.children")

    walk(doc.get("elements", []), None, "elements")

    def ancestors(eid: str) -> set[str]:
        out, cur = set(), parent_of.get(eid)
        while cur:
            out.add(cur)
            cur = parent_of.get(cur)
        return out

    seen_rel: set[tuple] = set()
    for i, r in enumerate(doc.get("relations", []) or []):
        p = f"relations[{i}]"
        if not isinstance(r, dict):
            errors.append(m("must_object", p=p))
            continue
        f, t = r.get("from"), r.get("to")
        p = f"{p}({f} -> {t})"
        for side, ref in (("from", f), ("to", t)):
            if ref not in elements:
                errors.append(m("rel_missing", p=p, side=side, ref=ref))
        if f in elements and t in elements:
            if f == t:
                errors.append(m("rel_self", p=p))
            elif f in ancestors(t) or t in ancestors(f):
                errors.append(m("rel_parent", p=p))
        if r.get("status", "unchanged") not in STATUSES:
            errors.append(m("bad_status", p=p, status=r.get("status")))
        elif is_system and r.get("status", "unchanged") != "unchanged":
            warnings.append(m("rel_sys_status", p=p, status=r["status"]))
        key = (f, t, r.get("label"))
        if key in seen_rel:
            warnings.append(m("rel_dup", p=p))
        seen_rel.add(key)

    touched: set[str] = set()
    step_ids: set[str] = set()
    for i, s in enumerate(doc.get("steps", []) or []):
        p = f"steps[{i}]"
        if not isinstance(s, dict):
            errors.append(m("must_object", p=p))
            continue
        sid = s.get("id")
        p = f"{p}({sid})"
        if sid in step_ids:
            errors.append(m("step_dup", p=p))
        step_ids.add(sid)
        touches = s.get("touches") or []
        if not touches:
            errors.append(m("step_empty", p=p))
        for ref in touches:
            if ref not in elements:
                errors.append(m("step_missing", p=p, ref=ref))
            touched.add(ref)

    # fluxos: cada salto segue uma relação que existe (ida, ou volta para uma resposta)
    rel_pairs = {(r.get("from"), r.get("to")) for r in doc.get("relations", []) or [] if isinstance(r, dict)}
    flow_ids: set[str] = set()
    for i, fl in enumerate(doc.get("flows", []) or []):
        p = f"flows[{i}]"
        if not isinstance(fl, dict):
            errors.append(m("must_object", p=p))
            continue
        fid = fl.get("id")
        p = f"{p}({fid})"
        if fid in flow_ids:
            errors.append(m("flow_dup", p=p))
        flow_ids.add(fid)
        if not fl.get("title"):
            errors.append(m("flow_title", p=p))
        hops = fl.get("hops") or []
        if not hops:
            errors.append(m("flow_empty", p=p))
        for j, h in enumerate(hops):
            hp = f"{p}.hops[{j}]"
            if not isinstance(h, dict):
                errors.append(m("must_object", p=hp))
                continue
            a, b = h.get("from"), h.get("to")
            missing = [x for x in (a, b) if x not in elements]
            if missing:
                errors.extend(m("hop_missing", p=hp, ref=x) for x in missing)
            elif (a, b) not in rel_pairs and (b, a) not in rel_pairs:
                errors.append(m("hop_norel", p=hp, a=a, b=b))

    # avisos que ajudam a IA a gerar um documento útil para revisão
    has_steps = bool(doc.get("steps")) and not is_system
    if is_system and not doc.get("flows"):
        warnings.append(m("sys_flows"))
    for eid, el in elements.items():
        st = el.get("status", "unchanged")
        if st in ("new", "changed"):
            # um step que toca o pai (ex.: o componente) também cobre o código dentro dele
            anc, p = [], parent_of.get(eid)
            while p:
                anc.append(p)
                p = parent_of.get(p)
            covered = eid in touched or any(c in touched for c in _descendants(el)) or any(a in touched for a in anc)
            if has_steps and not covered:
                warnings.append(m("no_step", eid=eid, status=st))
            # tudo que muda precisa poder ser aberto até o código
            et = el.get("type")
            if types.get(et, {}).get("openable") and not el.get("children"):
                below = [k for k, t in types.items() if et in t["parents"]]
                warnings.append(m("no_children", eid=eid, status=st, below="/".join(below)))

    return errors, warnings


def _descendants(el: dict):
    for c in el.get("children", []) or []:
        yield c["id"]
        yield from _descendants(c)


def title_of(doc: dict) -> str:
    t = doc.get("title") or doc.get("plan")
    return t if isinstance(t, str) else ""


# ---------------------------------------------------------------------- codec

def encode_payload(doc: dict) -> str:
    raw = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)  # deflate-raw
    data = comp.compress(raw) + comp.flush()
    return PREFIX + base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def decode_payload(s: str) -> dict:
    s = s.strip()
    if "#" in s:
        s = s.split("#", 1)[1]
    s = s.split("~", 1)[0]  # sufixo opcional "~<id>" = view aberta no viewer
    m = re.match(r"^v(\d+)\.(.*)$", s, re.S)
    if not m:
        sys.exit("erro: hash sem prefixo de versão (esperado 'v1.')")
    ver, body = int(m.group(1)), m.group(2)
    if ver != VERSION:
        sys.exit(f"erro: versão {ver} não suportada por este script (suporta {VERSION})")
    body += "=" * (-len(body) % 4)
    data = base64.urlsafe_b64decode(body)
    return json.loads(zlib.decompress(data, -15).decode("utf-8"))


# ---------------------------------------------------------------------- brief

def brief(doc: dict, url: str | None = None) -> str:
    """Markdown de execução: o que a IA deve seguir em cada passo do plano.
    Em kind: system, a documentação do sistema em texto (elementos, relações, fluxos)."""
    if doc.get("kind") == "system":
        return system_doc(doc, url)
    notation = load_notation(doc)
    L = lang_of(doc)
    index: dict[str, dict] = {}

    def walk(items):
        for el in items or []:
            index[el["id"]] = el
            walk(el.get("children"))

    walk(doc.get("elements"))
    name = lambda i: index[i]["name"] if i in index else i  # noqa: E731

    out = [f"# {msg(L, 'h_plan_c4' if notation['name'] == 'c4' else 'h_plan')}: {title_of(doc)}", ""]
    out.append(msg(L, "approved" if doc.get("approved") else "not_approved"))
    if url:
        out += ["", msg(L, "diagram", url=url)]
    if doc.get("description"):
        out += ["", doc["description"].strip()]
    out += ["", msg(L, "rules"), ""] + [msg(L, f"rule{i}") for i in range(1, 5)]
    status = lambda s: msg(L, f"status.{s}")  # noqa: E731

    def element_block(el: dict) -> list[str]:
        st = el.get("status", "unchanged")
        tech = f", {el['tech']}" if el.get("tech") else ""
        lines = [f"- **{el['name']}** (`{el['id']}` · {type_label(notation, el['type'])}{tech} · {status(st)})"]
        if el.get("path"):
            lines.append(f"  - {msg(L, 'file')}: `{el['path']}`")
        for c in el.get("constraints") or []:
            lines.append(f"  - {msg(L, 'constraint')}: {c}")
        if el.get("notes"):
            lines.append(f"  - {msg(L, 'reviewer_note')}: {el['notes'].strip()}")
        return lines

    def rel_line(r: dict) -> str:
        bits = [f"{name(r['from'])} → {name(r['to'])}"]
        if r.get("label"):
            bits.append(r["label"])
        if r.get("protocol"):
            bits.append(r["protocol"])
        s = " · ".join(bits)
        if r.get("status", "unchanged") != "unchanged":
            s += f" ({status(r['status'])})"
        if r.get("contract"):
            s += f" — {msg(L, 'contract')}: `{r['contract']}`"
        return f"- {s}"

    steps = doc.get("steps") or []
    if steps:
        out += ["", msg(L, "steps"), ""]
    for i, s in enumerate(steps, 1):
        ids = set()
        for t in s["touches"]:
            ids.add(t)
            if t in index:
                ids.update(_descendants(index[t]))
        out += [f"### {i}. {s['title']}", ""]
        if s.get("description"):
            out += [s["description"].strip(), ""]
        for t in s["touches"]:
            if t in index:
                out += element_block(index[t])
        rels = [r for r in doc.get("relations") or [] if r["from"] in ids or r["to"] in ids]
        if rels:
            out += ["", msg(L, "rels_involved")] + [rel_line(r) for r in rels]
        out.append("")

    out += flow_lines(doc, name, msg(L, "flows_plan"))

    touched = {t for s in steps for t in s["touches"]}
    loose = [el for el in index.values()
             if el.get("status", "unchanged") != "unchanged" and el["id"] not in touched
             and not notation["types"].get(el["type"], {}).get("context")
             and not any(d in touched for d in _descendants(el))]
    if loose:
        out += [msg(L, "loose"), ""]
        for el in loose:
            out += element_block(el)
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def flow_lines(doc: dict, name, heading: str) -> list[str]:
    flows = doc.get("flows") or []
    out = [heading, ""] if flows else []
    rel_label = {(r["from"], r["to"]): r.get("label") for r in doc.get("relations") or []}
    for fl in flows:
        out += [f"### {fl['title']}", ""]
        if fl.get("description"):
            out += [fl["description"].strip(), ""]
        for j, h in enumerate(fl["hops"], 1):
            text = h.get("label") or rel_label.get((h["from"], h["to"])) or rel_label.get((h["to"], h["from"])) or ""
            out.append(f"{j}. {name(h['from'])} → {name(h['to'])}" + (f": {text}" if text else ""))
        out.append("")
    return out


def system_doc(doc: dict, url: str | None = None) -> str:
    """Documentação do sistema como é hoje: árvore de elementos, relações e fluxos."""
    notation = load_notation(doc)
    L = lang_of(doc)
    index: dict[str, dict] = {}
    out = [f"# {msg(L, 'h_sys_c4' if notation['name'] == 'c4' else 'h_sys')}: {title_of(doc)}", ""]
    if url:
        out += [msg(L, "diagram", url=url), ""]
    if doc.get("description"):
        out += [doc["description"].strip(), ""]
    out += [msg(L, "elements"), ""]

    def walk(items, depth: int):
        for el in items or []:
            index[el["id"]] = el
            bits = [type_label(notation, el["type"])] + ([el["tech"]] if el.get("tech") else [])
            line = f"{'  ' * depth}- **{el['name']}** ({' · '.join(bits)})"
            if el.get("description"):
                line += f": {el['description'].strip()}"
            out.append(line)
            if el.get("path"):
                out.append(f"{'  ' * (depth + 1)}- {msg(L, 'file')}: `{el['path']}`")
            for c in el.get("constraints") or []:
                out.append(f"{'  ' * (depth + 1)}- {msg(L, 'rule')}: {c}")
            walk(el.get("children"), depth + 1)

    walk(doc.get("elements"), 0)
    name = lambda i: index[i]["name"] if i in index else i  # noqa: E731
    rels = doc.get("relations") or []
    if rels:
        out += ["", msg(L, "relations"), ""]
        for r in rels:
            bits = [f"{name(r['from'])} → {name(r['to'])}"] + [r[k] for k in ("label", "protocol") if r.get(k)]
            out.append("- " + " · ".join(bits) + (f" — {msg(L, 'contract')}: `{r['contract']}`" if r.get("contract") else ""))
    out += [""] + flow_lines(doc, name, msg(L, "flows"))
    return "\n".join(out).rstrip() + "\n"


def looks_like_link(s: str) -> bool:
    """URL do viewer, '#v1.…' ou payload 'v1.…' (em vez de caminho de arquivo)."""
    return bool(re.search(r"(^|#)v\d+\.", s.strip()))


def default_base() -> str:
    """$BLUEROLL_VIEWER_URL (outro host; $C4PLAN_VIEWER_URL ainda vale) ou a versão publicada no GitHub Pages."""
    return os.environ.get("BLUEROLL_VIEWER_URL") or os.environ.get("C4PLAN_VIEWER_URL") or PUBLIC_VIEWER_URL


def with_embed(base: str) -> str:
    """Liga o modo iframe (?embed): o viewer mostra só o diagrama, sem cabeçalho nem painel."""
    return base + ("&" if "?" in base else "?") + "embed"


def local_base() -> str:
    """Build local (viewer/dist/index.html), para testar mudanças no viewer antes de publicar."""
    if not VIEWER_PATH.exists():
        sys.exit(f"build local não encontrado: {VIEWER_PATH} (--local só funciona num clone do repositório, depois de npm run build em viewer/)")
    p = str(VIEWER_PATH)
    m = re.match(r"^/mnt/([a-z])/(.*)$", p)  # WSL -> caminho Windows
    if m:
        return f"file:///{m.group(1).upper()}:/{m.group(2)}"
    return VIEWER_PATH.as_uri()


# ------------------------------------------------------------------------ cli

def report(errors: list[str], warnings: list[str], lang: str = DEFAULT_LANG) -> None:
    for w in warnings:
        print(f"{msg(lang, 'warn')}: {w}", file=sys.stderr)
    for e in errors:
        print(f"{msg(lang, 'error')}:  {e}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("validate", help="valida o documento")
    v.add_argument("file")

    e = sub.add_parser("encode", help="valida e gera a URL do viewer")
    e.add_argument("file")
    e.add_argument("--base", help=f"URL do viewer (padrão: $BLUEROLL_VIEWER_URL ou {PUBLIC_VIEWER_URL})")
    e.add_argument("--local", action="store_true", help="usa o build local viewer/dist/index.html")
    e.add_argument("--embed", action="store_true", help="link para <iframe>: só o diagrama, sem cabeçalho nem painel")

    d = sub.add_parser("decode", help="converte URL/hash de volta para YAML")
    d.add_argument("url")
    d.add_argument("-o", "--output")
    d.add_argument("--json", action="store_true", help="saída em JSON em vez de YAML")

    b = sub.add_parser("brief", help="gera o markdown de execução (plan) ou a documentação em texto (system)")
    b.add_argument("source", help="arquivo .yaml/.json ou URL/hash do viewer")
    b.add_argument("-o", "--output")

    a = ap.parse_args()

    if a.cmd == "brief":
        is_file = not looks_like_link(a.source)
        doc = load(a.source) if is_file else decode_payload(a.source)
        L = lang_of(doc)
        errors, warnings = validate(doc)
        report(errors, warnings, L)
        if errors:
            sys.exit(1)
        md = brief(doc, None if is_file else a.source.strip())
        if a.output:
            Path(a.output).write_text(md, encoding="utf-8")
            print(msg(L, "written", path=a.output), file=sys.stderr)
        else:
            sys.stdout.write(md)
        return

    if a.cmd in ("validate", "encode"):
        doc = load(a.file)
        L = lang_of(doc)
        errors, warnings = validate(doc)
        report(errors, warnings, L)
        if errors:
            print("\n" + msg(L, "n_errors", n=len(errors)), file=sys.stderr)
            sys.exit(1)
        if a.cmd == "validate":
            print(msg(L, "ok", n=len(warnings)))
            return
        base = a.base or (local_base() if a.local else default_base())
        url = (with_embed(base) if a.embed else base) + "#" + encode_payload(doc)
        print(url)
        print(msg(L, "chars", n=len(url)), file=sys.stderr)
        return

    doc = decode_payload(a.url)
    L = lang_of(doc)
    errors, warnings = validate(doc)
    report(errors, warnings, L)
    out = json.dumps(doc, ensure_ascii=False, indent=2) + "\n" if a.json else dump_yaml(doc)
    if a.output:
        Path(a.output).write_text(out, encoding="utf-8")
        print(msg(L, "written", path=a.output), file=sys.stderr)
    else:
        sys.stdout.write(out)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
