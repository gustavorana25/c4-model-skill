#!/usr/bin/env python3
"""C4 Plan — converte arch.yaml <-> URL do viewer.

Uso:
  arch_url.py validate <arquivo.yaml|json>
  arch_url.py encode   <arquivo.yaml|json> [--base URL]
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

VERSION = 1
PREFIX = f"v{VERSION}."
ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schema" / "arch.v1.json"
VIEWER_PATH = ROOT / "viewer" / "dist" / "index.html"  # build autocontido (npm run build)

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
TYPES = {"person", "system", "external", "container", "database", "queue", "component", "code"}
STATUSES = {"new", "changed", "removed", "unchanged"}
# tipos que, quando o plano os cria ou altera, precisam abrir um nível abaixo (até chegar em code)
OPENABLE = {"system", "container", "database", "queue", "component"}
DETAILS = {"locked", "guided", "delegated"}
# tipo do filho -> tipos de pai permitidos (None = pode ficar na raiz)
ALLOWED_PARENTS = {
    "person": {None},
    "external": {None},
    "system": {None},
    "container": {None, "system"},
    "database": {None, "system"},
    "queue": {None, "system"},
    # dentro de database/queue: tabela, migração, evento (o que muda no dado)
    "component": {"container", "database", "queue"},
    "code": {"component"},
}


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

    if not isinstance(doc, dict):
        return ["documento precisa ser um objeto/mapa"], []

    # 1. estrutura via JSON Schema (se disponível)
    try:
        import jsonschema  # type: ignore

        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        validator = jsonschema.Draft202012Validator(schema)
        for e in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
            loc = "/".join(str(p) for p in e.path) or "(raiz)"
            errors.append(f"{loc}: {e.message}")
        if errors:
            return errors, warnings  # checagens semânticas assumem estrutura válida
    except ImportError:
        warnings.append("jsonschema não instalado: validação estrutural reduzida")

    # 2. checagens estruturais mínimas (sempre) + semânticas
    if doc.get("version") != VERSION:
        errors.append(f"version: esperado {VERSION}")
    if not isinstance(doc.get("plan"), str) or not doc["plan"].strip():
        errors.append("plan: obrigatório")

    elements: dict[str, dict] = {}
    parent_of: dict[str, str | None] = {}

    def walk(items, parent: dict | None, path: str):
        if not isinstance(items, list):
            errors.append(f"{path}: precisa ser uma lista")
            return
        for i, el in enumerate(items):
            p = f"{path}[{i}]"
            if not isinstance(el, dict):
                errors.append(f"{p}: precisa ser um objeto")
                continue
            eid, etype = el.get("id"), el.get("type")
            p = f"{p}({eid})"
            if not isinstance(eid, str) or not ID_RE.match(eid):
                errors.append(f"{p}: id inválido (use kebab-case)")
                continue
            if eid in elements:
                errors.append(f"{p}: id duplicado")
                continue
            if etype not in TYPES:
                errors.append(f"{p}: type inválido '{etype}'")
            if not el.get("name"):
                errors.append(f"{p}: name obrigatório")
            if el.get("status", "unchanged") not in STATUSES:
                errors.append(f"{p}: status inválido '{el.get('status')}'")
            if "detail" in el and el["detail"] not in DETAILS:
                errors.append(f"{p}: detail inválido '{el['detail']}'")

            ptype = parent.get("type") if parent else None
            allowed = ALLOWED_PARENTS.get(etype, set())
            if etype in TYPES and ptype not in allowed:
                where = f"dentro de '{ptype}'" if ptype else "na raiz"
                ok = ", ".join(sorted("raiz" if a is None else a for a in allowed))
                errors.append(f"{p}: '{etype}' não pode ficar {where} (permitido: {ok})")

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
            errors.append(f"{p}: precisa ser um objeto")
            continue
        f, t = r.get("from"), r.get("to")
        p = f"{p}({f} -> {t})"
        for side, ref in (("from", f), ("to", t)):
            if ref not in elements:
                errors.append(f"{p}: {side} '{ref}' não existe")
        if f in elements and t in elements:
            if f == t:
                errors.append(f"{p}: relação de um elemento com ele mesmo")
            elif f in ancestors(t) or t in ancestors(f):
                errors.append(f"{p}: relação entre pai e filho não faz sentido em C4")
        if r.get("status", "unchanged") not in STATUSES:
            errors.append(f"{p}: status inválido '{r.get('status')}'")
        key = (f, t, r.get("label"))
        if key in seen_rel:
            warnings.append(f"{p}: relação duplicada")
        seen_rel.add(key)

    touched: set[str] = set()
    step_ids: set[str] = set()
    for i, s in enumerate(doc.get("steps", []) or []):
        p = f"steps[{i}]"
        if not isinstance(s, dict):
            errors.append(f"{p}: precisa ser um objeto")
            continue
        sid = s.get("id")
        p = f"{p}({sid})"
        if sid in step_ids:
            errors.append(f"{p}: id de step duplicado")
        step_ids.add(sid)
        touches = s.get("touches") or []
        if not touches:
            errors.append(f"{p}: touches vazio")
        for ref in touches:
            if ref not in elements:
                errors.append(f"{p}: touches '{ref}' não existe")
            touched.add(ref)

    # avisos que ajudam a IA a gerar um documento útil para revisão
    has_steps = bool(doc.get("steps"))
    for eid, el in elements.items():
        st = el.get("status", "unchanged")
        implementable = el.get("type") not in ("person", "external", "system")
        if st in ("new", "changed"):
            if implementable and "detail" not in el:
                warnings.append(f"{eid}: status '{st}' sem detail — defina locked/guided/delegated")
            # um step que toca o pai (ex.: o componente) também cobre o código dentro dele
            anc, p = [], parent_of.get(eid)
            while p:
                anc.append(p)
                p = parent_of.get(p)
            covered = eid in touched or any(c in touched for c in _descendants(el)) or any(a in touched for a in anc)
            if has_steps and not covered:
                warnings.append(f"{eid}: status '{st}' mas nenhum step toca este elemento")
            # tudo que muda precisa poder ser aberto até o código
            if el.get("type") in OPENABLE and not el.get("children"):
                below = "code" if el["type"] == "component" else "component"
                warnings.append(f"{eid}: status '{st}' sem children — o humano não consegue abrir; detalhe com '{below}'")
        if el.get("detail") == "guided" and not el.get("constraints"):
            warnings.append(f"{eid}: detail 'guided' sem constraints — o que a IA deve seguir?")

    return errors, warnings


def _descendants(el: dict):
    for c in el.get("children", []) or []:
        yield c["id"]
        yield from _descendants(c)


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

TYPE_PT = {"person": "pessoa", "system": "sistema", "external": "sistema externo", "container": "container",
           "database": "banco de dados", "queue": "fila", "component": "componente",
           "code": "código"}
STATUS_PT = {"new": "novo", "changed": "alterado", "removed": "removido", "unchanged": "inalterado"}
DETAIL_RULE = {
    "locked": "🔒 locked — não altere estrutura, contrato nem tecnologia. Se precisar, PARE e pergunte.",
    "guided": "🧭 guided — implemente seguindo as restrições.",
    "delegated": "🤖 delegated — design interno a seu critério (restrições listadas continuam valendo).",
}


def brief(doc: dict, url: str | None = None) -> str:
    """Markdown de execução: o que a IA deve seguir em cada passo do plano."""
    index: dict[str, dict] = {}

    def walk(items):
        for el in items or []:
            index[el["id"]] = el
            walk(el.get("children"))

    walk(doc.get("elements"))
    name = lambda i: index[i]["name"] if i in index else i  # noqa: E731

    out = [f"# Arquitetura do plano: {doc['plan']}", ""]
    if doc.get("approved"):
        out.append("> ✅ Estrutura **aprovada** pelo humano.")
    else:
        out.append("> ⚠️ Estrutura **NÃO aprovada**. Não execute: peça a aprovação no chat primeiro.")
    if url:
        out += ["", f"Diagrama: {url}"]
    if doc.get("description"):
        out += ["", doc["description"].strip()]
    out += ["", "## Regras de liberdade", ""] + [f"- {r}" for r in DETAIL_RULE.values()]
    out += ["- Sem nível definido: trate como 🧭 guided e pergunte se houver dúvida de design.",
            "- Notas do revisor são instruções do humano e têm prioridade."]

    def element_block(el: dict) -> list[str]:
        st = el.get("status", "unchanged")
        tech = f", {el['tech']}" if el.get("tech") else ""
        lines = [f"- **{el['name']}** (`{el['id']}` · {TYPE_PT.get(el['type'], el['type'])}{tech} · {STATUS_PT[st]})"]
        if el.get("path"):
            lines.append(f"  - Arquivo: `{el['path']}`")
        if el.get("detail"):
            lines.append(f"  - {DETAIL_RULE[el['detail']]}")
        for c in el.get("constraints") or []:
            lines.append(f"  - Restrição: {c}")
        if el.get("notes"):
            lines.append(f"  - Nota do revisor: {el['notes'].strip()}")
        return lines

    def rel_line(r: dict) -> str:
        bits = [f"{name(r['from'])} → {name(r['to'])}"]
        if r.get("label"):
            bits.append(r["label"])
        if r.get("protocol"):
            bits.append(r["protocol"])
        s = " · ".join(bits)
        if r.get("status", "unchanged") != "unchanged":
            s += f" ({STATUS_PT[r['status']]})"
        if r.get("contract"):
            s += f" — contrato: `{r['contract']}`"
        return f"- {s}"

    steps = doc.get("steps") or []
    if steps:
        out += ["", "## Passos", ""]
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
            out += ["", "Relações envolvidas:"] + [rel_line(r) for r in rels]
        out.append("")

    touched = {t for s in steps for t in s["touches"]}
    loose = [el for el in index.values()
             if el.get("status", "unchanged") != "unchanged" and el["id"] not in touched
             and el["type"] not in ("person", "external", "system")
             and not any(d in touched for d in _descendants(el))]
    if loose:
        out += ["## Mudanças sem passo associado", ""]
        for el in loose:
            out += element_block(el)
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def looks_like_link(s: str) -> bool:
    """URL do viewer, '#v1.…' ou payload 'v1.…' (em vez de caminho de arquivo)."""
    return bool(re.search(r"(^|#)v\d+\.", s.strip()))


def default_base() -> str:
    env = os.environ.get("C4PLAN_VIEWER_URL")
    if env:
        return env
    p = str(VIEWER_PATH)
    m = re.match(r"^/mnt/([a-z])/(.*)$", p)  # WSL -> caminho Windows
    if m:
        return f"file:///{m.group(1).upper()}:/{m.group(2)}"
    return VIEWER_PATH.as_uri()


# ------------------------------------------------------------------------ cli

def report(errors: list[str], warnings: list[str]) -> None:
    for w in warnings:
        print(f"aviso: {w}", file=sys.stderr)
    for e in errors:
        print(f"erro:  {e}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("validate", help="valida o documento")
    v.add_argument("file")

    e = sub.add_parser("encode", help="valida e gera a URL do viewer")
    e.add_argument("file")
    e.add_argument("--base", help="URL do viewer (padrão: $C4PLAN_VIEWER_URL ou viewer/index.html local)")

    d = sub.add_parser("decode", help="converte URL/hash de volta para YAML")
    d.add_argument("url")
    d.add_argument("-o", "--output")
    d.add_argument("--json", action="store_true", help="saída em JSON em vez de YAML")

    b = sub.add_parser("brief", help="gera o markdown de execução para a IA")
    b.add_argument("source", help="arquivo .yaml/.json ou URL/hash do viewer")
    b.add_argument("-o", "--output")

    a = ap.parse_args()

    if a.cmd == "brief":
        is_file = not looks_like_link(a.source)
        doc = load(a.source) if is_file else decode_payload(a.source)
        errors, warnings = validate(doc)
        report(errors, warnings)
        if errors:
            sys.exit(1)
        md = brief(doc, None if is_file else a.source.strip())
        if a.output:
            Path(a.output).write_text(md, encoding="utf-8")
            print(f"escrito em {a.output}", file=sys.stderr)
        else:
            sys.stdout.write(md)
        return

    if a.cmd in ("validate", "encode"):
        doc = load(a.file)
        errors, warnings = validate(doc)
        report(errors, warnings)
        if errors:
            print(f"\n{len(errors)} erro(s). Corrija antes de gerar a URL.", file=sys.stderr)
            sys.exit(1)
        if a.cmd == "validate":
            print(f"ok ({len(warnings)} aviso(s))")
            return
        url = (a.base or default_base()) + "#" + encode_payload(doc)
        print(url)
        print(f"({len(url)} caracteres)", file=sys.stderr)
        return

    doc = decode_payload(a.url)
    errors, warnings = validate(doc)
    report(errors, warnings)
    out = json.dumps(doc, ensure_ascii=False, indent=2) + "\n" if a.json else dump_yaml(doc)
    if a.output:
        Path(a.output).write_text(out, encoding="utf-8")
        print(f"escrito em {a.output}", file=sys.stderr)
    else:
        sys.stdout.write(out)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
