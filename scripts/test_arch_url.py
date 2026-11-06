"""Testes do arch_url.py. Rodar: python3 scripts/test_arch_url.py"""
import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import arch_url as A  # noqa: E402
import yaml  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
doc = yaml.safe_load((ROOT / "examples" / "pix.arch.yaml").read_text(encoding="utf-8"))
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
check("step tocando id inexistente", any("não existe" in e for e in broken(
    lambda d: d["steps"].append({"id": "s9", "title": "x", "touches": ["nada"]}))))
check("detail inválido", len(broken(
    lambda d: d["elements"][1]["children"][0].update(detail="talvez"))) > 0)

d = copy.deepcopy(doc)
d["elements"][1]["children"][1]["children"][1].pop("detail")
check("aviso: new sem detail", any("sem detail" in w for w in A.validate(d)[1]))

print(f"\n{'TUDO OK' if not fails else f'{fails} falha(s)'}")
sys.exit(1 if fails else 0)
