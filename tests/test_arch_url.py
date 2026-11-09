"""Testes do arch_url.py. Rodar da raiz: python3 tests/test_arch_url.py"""
import copy
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "skills" / "blueroll"
sys.path.insert(0, str(SKILL / "scripts"))
import arch_url as A  # noqa: E402
import yaml  # noqa: E402

doc = yaml.safe_load((SKILL / "examples" / "pix.arch.yaml").read_text(encoding="utf-8"))
fails = 0


def check(name, cond):
    global fails
    print(("ok   " if cond else "FAIL ") + name)
    fails += 0 if cond else 1


errs, warns = A.validate(doc)
check("exemplo PIX válido", errs == [])
check("exemplo PIX sem avisos", warns == [])

payload = A.encode_payload(doc)
check("payload tem prefixo v1.", payload.startswith("v1."))
check("roundtrip payload", A.decode_payload(payload) == doc)
check("roundtrip com URL completa", A.decode_payload("file:///x/index.html#" + payload) == doc)
check("roundtrip com #hash", A.decode_payload("#" + payload) == doc)

ts_fixture = ROOT / "viewer" / "src" / "lib" / "__fixtures__" / "pix.ts.hash.txt"
if ts_fixture.exists():  # gerada pelos testes do viewer (npm test)
    ts_doc = A.decode_payload(ts_fixture.read_text(encoding="utf-8"))
    expected = copy.deepcopy(doc)
    expected["approved"] = True
    check("lê hash gerado pelo viewer (TS)", ts_doc == expected)
else:
    print("pulado: fixture do viewer ausente (rode npm test em viewer/)")


_env = os.environ.pop("C4PLAN_VIEWER_URL", None)
check("viewer padrão é o GitHub Pages", A.default_base() == A.PUBLIC_VIEWER_URL and A.PUBLIC_VIEWER_URL.startswith("https://"))
os.environ["C4PLAN_VIEWER_URL"] = "https://outro.host/c4/"
check("C4PLAN_VIEWER_URL tem prioridade", A.default_base() == "https://outro.host/c4/")
if _env is None:
    os.environ.pop("C4PLAN_VIEWER_URL")
else:
    os.environ["C4PLAN_VIEWER_URL"] = _env

check("reconhece link pelo formato", all(A.looks_like_link(x) for x in [payload, "#" + payload, "http://x/i.html#" + payload]))
check("reconhece caminho de arquivo", not A.looks_like_link("examples/pix.arch.yaml"))
check("brief de hash puro", "### 1." in A.brief(A.decode_payload("#" + payload)))


def broken(mutate):
    d = copy.deepcopy(doc)
    mutate(d)
    return A.validate(d)[0]

check("relação para id inexistente", any("não existe" in e for e in broken(
    lambda d: d["relations"].append({"from": "pix-handler", "to": "fantasma"}))))
check("id duplicado", any("duplicado" in e for e in broken(
    lambda d: d["elements"].append({"id": "psp", "type": "external", "name": "x"}))))
check("component na raiz", any("não pode ficar" in e for e in broken(
    lambda d: d["elements"].append({"id": "solto", "type": "component", "name": "x"}))))
check("relação pai-filho", any("pai e filho" in e for e in broken(
    lambda d: d["relations"].append({"from": "checkout-api", "to": "pix-handler"}))))
check("salto de fluxo sem relação", any("não segue nenhuma relação" in e for e in broken(
    lambda d: d["flows"][0]["hops"].append({"from": "cliente", "to": "psp"}))))
check("salto de fluxo com id inexistente", any("não existe" in e for e in broken(
    lambda d: d["flows"][0]["hops"].append({"from": "cliente", "to": "nada"}))))
check("brief lista os fluxos", "## Fluxos" in A.brief(doc) and "devolve QR Code" in A.brief(doc))
check("step tocando id inexistente", any("não existe" in e for e in broken(
    lambda d: d["steps"].append({"id": "s9", "title": "x", "touches": ["nada"]}))))
check("icon de elemento conhecido passa", A.validate(
    {**doc, "elements": [{"id": "x", "type": "person", "name": "X", "icon": "table"}]})[1] == A.validate(
    {**doc, "elements": [{"id": "x", "type": "person", "name": "X"}]})[1])
check("icon de elemento desconhecido vira aviso", any("'nada'" in w for w in A.validate(
    {**doc, "elements": [{"id": "x", "type": "person", "name": "X", "icon": "nada"}]})[1]))
check("detail antigo vira aviso", any("'detail' não é mais usado" in w for w in A.validate(
    {**doc, "elements": [{"id": "x", "type": "person", "name": "X", "detail": "locked"}]})[1]))


check("exemplo abre tudo que muda", not any("sem children" in w for w in A.validate(doc)[1]))
d = copy.deepcopy(doc)
d["elements"][1]["children"][1]["children"][1].pop("children")  # pix-handler sem code
check("aviso: componente novo que não abre", any("pix-handler" in w and "sem children" in w for w in A.validate(d)[1]))

# kind: system (documentação do sistema como é hoje)
loja = yaml.safe_load((SKILL / "examples" / "loja.arch.yaml").read_text(encoding="utf-8"))
errs, warns = A.validate(loja)
check("exemplo da loja (system) válido e sem avisos", errs == [] and warns == [])
md = A.brief(loja)
check("system: brief vira documentação", md.startswith("# Arquitetura: Loja Online") and "## Elementos" in md
      and "## Fluxos" in md and "aprovada" not in md and "## Regras" not in md)
check("system: avisa status e steps", (lambda w: any("kind: system" in x and "status" in x for x in w)
      and any(x.startswith("steps:") for x in w))(A.validate({**loja, "steps": [{"id": "s1", "title": "x", "touches": ["loja"]}],
      "elements": loja["elements"] + [{"id": "novo", "type": "person", "name": "N", "status": "new"}]})[1]))
check("system: sem título é erro", any("title" in e for e in A.validate({k: v for k, v in loja.items() if k != "title"})[0]))
check("kind inválido é erro", any("kind" in e for e in A.validate({**loja, "kind": "outro"})[0]))
check("plan continua aceitando title no lugar de plan",
      A.validate({**{k: v for k, v in doc.items() if k != "plan"}, "title": "X"})[0] == [])

# notações (vocabulário de tipos)
py_fixture = ROOT / "viewer" / "src" / "lib" / "__fixtures__" / "pix.python.hash.txt"
check("hash do PIX igual ao de antes das notações (links antigos)",
      A.encode_payload(doc) == py_fixture.read_text(encoding="utf-8").strip())
for path in sorted((SKILL / "examples").glob("*.arch.yaml")):
    ex = yaml.safe_load(path.read_text(encoding="utf-8"))
    check(f"exemplo {path.name} válido e sem avisos", A.validate(ex) == ([], []))


def shape(d):
    """O que precisa ser igual entre as traduções de um exemplo: ids, tipos, status, relações, passos e saltos."""
    els = []

    def walk(items):
        for el in items or []:
            els.append((el["id"], el["type"], el.get("status")))
            walk(el.get("children"))
    walk(d["elements"])
    return (els, [(r["from"], r["to"], r.get("status")) for r in d.get("relations") or []],
            [(s["id"], tuple(s["touches"])) for s in d.get("steps") or []],
            [(f["id"], [(h["from"], h["to"]) for h in f["hops"]]) for f in d.get("flows") or []],
            d.get("kind"), d.get("notation"), [t["id"] for t in d.get("types") or []])


for name in ("2fa", "aws", "jornada"):
    versions = {lg: yaml.safe_load((SKILL / "examples" / f"{name}{suffix}.arch.yaml").read_text(encoding="utf-8"))
                for lg, suffix in (("pt-BR", ""), ("en", ".en"), ("es", ".es"))}
    check(f"exemplo {name}: lang de cada tradução", all(d.get("lang") == lg for lg, d in versions.items()))
    check(f"exemplo {name}: traduções com a mesma estrutura", shape(versions["en"]) == shape(versions["pt-BR"]) == shape(versions["es"]))
check("notation inexistente é erro", any("notation" in e for e in A.validate({**doc, "notation": "nada"})[0]))
check("tipo de outra notação é erro", any("não existe na notação processo" in e for e in A.validate({**doc, "notation": "processo"})[0]))
proc = {"version": 1, "kind": "system", "notation": "processo", "title": "P",
        "elements": [{"id": "r", "type": "raia", "name": "R", "children": [{"id": "e", "type": "etapa", "name": "E"}]},
                     {"id": "x", "type": "time", "name": "X"}],
        "types": [{"id": "time", "label": "Time", "icon": "users", "color": "pink"}], "flows": [{"id": "f", "title": "F", "hops": [{"from": "x", "to": "e"}]}],
        "relations": [{"from": "x", "to": "e"}]}
check("tipo próprio é aceito", A.validate(proc) == ([], []))
check("aninhamento segue a notação", any("não pode ficar" in e for e in A.validate(
    {**proc, "elements": [{"id": "e", "type": "etapa", "name": "E", "children": [{"id": "r", "type": "raia", "name": "R"}]}], "relations": [], "flows": []})[0]))
check("parents de tipo próprio precisa existir", any("parents 'nada'" in e for e in A.validate(
    {**proc, "types": [{"id": "time", "label": "Time", "parents": ["nada"]}]})[0]))
check("cor inválida é erro", any("color" in e for e in A.validate({**proc, "types": [{"id": "time", "label": "T", "color": "roxo"}]})[0]))
check("ícone desconhecido é aviso", any("ícone" in w for w in A.validate({**proc, "types": [{"id": "time", "label": "T", "icon": "foguete"}]})[1]))
check("brief usa o rótulo da notação", "(etapa)" in A.brief(proc) and "**R** (raia)" in A.brief(proc))
infra = {"version": 1, "notation": "infra", "plan": "Réplica",
         "elements": [{"id": "db-replica", "type": "banco", "name": "Réplica", "tech": "PostgreSQL 16", "status": "new"}],
         "steps": [{"id": "s1", "title": "Criar", "touches": ["db-replica"]}]}
check("brief de plano em outra notação", A.validate(infra) == ([], []) and A.brief(infra).startswith("# Plano: Réplica")
      and "(`db-replica` · banco, PostgreSQL 16 · novo)" in A.brief(infra))
aws = yaml.safe_load((SKILL / "examples" / "aws.arch.yaml").read_text(encoding="utf-8"))
check("documentação usa o rótulo do tipo próprio", "**Papel da API** (papel iam)" in A.brief(aws) and A.brief(aws).startswith("# Diagrama: "))
# idioma (lang)
check("sem lang continua em pt-BR", A.brief(doc).startswith("# Arquitetura do plano:") and "## Regras" in A.brief(doc))
en_doc = {**doc, "lang": "en"}
check("lang en: validação sem erros", A.validate(en_doc) == ([], []))
md_en = A.brief(en_doc)
check("lang en: brief em inglês", md_en.startswith("# Plan architecture:") and "## Rules" in md_en and "## Steps" in md_en
      and "## Regras" not in md_en)
check("lang en: rótulo do tipo traduzido", "· container" in md_en and "(`pix-handler` · component" in md_en)
check("lang en: status traduzido", "· new)" in md_en or "· changed)" in md_en)
check("lang es: mensagens de validação em espanhol", any("no existe" in e for e in A.validate(
    {**doc, "lang": "es", "relations": doc["relations"] + [{"from": "pix-handler", "to": "fantasma"}]})[0]))
check("lang inválido é erro", any(e.startswith("lang:") for e in A.validate({**doc, "lang": "fr"})[0]))
check("lang en: tipo próprio fica como está", "(papel iam)" in A.brief({**aws, "lang": "en"})
      and A.brief({**aws, "lang": "en"}).startswith("# Diagram: "))
check("lang não muda o hash sem lang", A.encode_payload(doc) == py_fixture.read_text(encoding="utf-8").strip())
_i18n = __import__("json").loads((SKILL / "schema" / "notations.i18n.json").read_text(encoding="utf-8"))
check("toda notação tem tradução en e es", all(
    set(_i18n[lg]) == set(A.presets()["notations"]) for lg in ("en", "es")))
M = __import__("messages").MESSAGES
check("mensagens com as mesmas chaves nos 3 idiomas", set(M["en"]) == set(M["pt-BR"]) == set(M["es"]))

check("--embed acrescenta ?embed", A.with_embed("https://h/x/") == "https://h/x/?embed")
check("--embed respeita query existente", A.with_embed("https://h/?a=1") == "https://h/?a=1&embed")

# sem jsonschema, itens que não são objeto viram erro (e não AttributeError)
_js = sys.modules.get("jsonschema")
sys.modules["jsonschema"] = None  # import jsonschema -> ImportError
try:
    _bad_hop = {"version": 1, "title": "x", "elements": [], "flows": [{"id": "f", "title": "t", "hops": ["a"]}]}
    _bad_type = {"version": 1, "title": "x", "types": ["oops"], "elements": []}
    check("sem jsonschema: salto que não é objeto vira erro",
          any("hops[0]" in e for e in A.validate(_bad_hop)[0]))
    check("sem jsonschema: tipo que não é objeto vira erro",
          any("types[0]" in e for e in A.validate(_bad_type)[0]))
finally:
    if _js is None:
        del sys.modules["jsonschema"]
    else:
        sys.modules["jsonschema"] = _js

_b = os.environ.pop("BLUEROLL_VIEWER_URL", None)
os.environ["BLUEROLL_VIEWER_URL"] = "https://b.host/"
check("BLUEROLL_VIEWER_URL tem prioridade", A.default_base() == "https://b.host/")
os.environ.pop("BLUEROLL_VIEWER_URL")
if _b is not None:
    os.environ["BLUEROLL_VIEWER_URL"] = _b

print(f"\n{'TUDO OK' if not fails else f'{fails} falha(s)'}")
sys.exit(1 if fails else 0)
