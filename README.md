# C4 Plan

Skill + viewer para o humano ver como um plano afeta a arquitetura (estilo C4), tirar dúvidas e pedir mudanças antes da IA executar. O viewer só mostra; a conversa e a aprovação ficam no chat.

O mesmo formato também documenta o sistema como é hoje (`kind: system`): diagrama e fluxos, sem status nem passos. Serve para onboarding e para entender um repositório.

```
plano ─► arch.yaml ─► arch_url.py encode ─► link ─► humano olha e comenta ─► IA ajusta o YAML ─► ok no chat ─► arch_url.py brief ─► execução
```

| Pasta | O que é |
|---|---|
| `SKILL.md` | Instruções da skill para a IA |
| `schema/arch.v1.json` | JSON Schema do `arch.yaml` |
| `scripts/arch_url.py` | `validate`, `encode`, `decode`, `brief` (stdlib + PyYAML) |
| `examples/` | `pix.arch.yaml`: plano (adicionar PIX). `loja.arch.yaml`: documentação da mesma loja antes do PIX |
| `viewer/` | Front-end (Vite + React + TS + Tailwind + React Flow + ELK) |

## Como rodar (nesta máquina, Windows)

**Pré-requisitos**

| Ferramenta | Onde está |
|---|---|
| Node 26 LTS + npm 11 | `C:\Users\gusta\AppData\Local\Programs\nodejs` (no PATH do usuário) |
| Python 3.12 + PyYAML | **Só no WSL** (`Ubuntu-24.04`). No Windows não há Python. |

**Viewer** (PowerShell, a partir da raiz do projeto):

```powershell
npm run setup    # primeira vez: instala as dependências do viewer/
npm run dev      # http://localhost:5173
npm test         # testes do viewer
npm run build    # gera viewer/dist/index.html
```

**Script Python** (pelo WSL):

```powershell
wsl -d Ubuntu-24.04 --cd /mnt/c/Users/gusta/workspace/c4model -- python3 scripts/arch_url.py encode examples/pix.arch.yaml
wsl -d Ubuntu-24.04 --cd /mnt/c/Users/gusta/workspace/c4model -- python3 scripts/test_arch_url.py
```

**Problemas comuns**

- `npm` não reconhecido: o terminal foi aberto antes do Node entrar no PATH. Feche e reabra o app/terminal, ou chame pelo caminho completo: `& "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd" run dev`.
- `ENOENT package.json`: você está fora da raiz do projeto ou do `viewer/`.
- `&&` dá erro: o PowerShell 5.1 não aceita `&&`; use `;` ou rode um comando por vez.
- Erro de binário nativo (rolldown, tailwind oxide, lightningcss) ao trocar entre WSL e Windows: reinstale com `npm run setup` no sistema em que vai rodar.
- Porta 5173 ocupada: já existe um `npm run dev` aberto; pare com Ctrl+C ou o Vite usa a 5174.

## Formato do link

```
<viewer>#v1.<base64url(deflate-raw(json))>[~<id da view aberta>]
```

O estado inteiro vai no `#hash`, que **não é enviado ao servidor**. O viewer é estático: hospede onde quiser.

## Viewer

Da raiz também funciona: `npm run setup`, `npm run dev`, `npm test` e `npm run build` repassam os comandos para o `viewer/`.

```bash
cd viewer
npm install
npm run dev      # http://localhost:5173
npm test         # codec (compatível com o Python) + lógica das views
npm run build    # gera dist/index.html: arquivo único, sem CDN
```

`dist/index.html` funciona aberto direto do disco ou em qualquer host estático (GitHub Pages, Vercel, Netlify, S3, servidor interno).

**Versão publicada:** https://gustavorana25.github.io/c4-model-skill/

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) testa, gera o build e publica no GitHub Pages a cada push no `main`. Para ativar num fork: **Settings → Pages → Source: GitHub Actions**.

O `arch_url.py encode` gera links para essa versão por padrão. Para outro host, defina `C4PLAN_VIEWER_URL`; para testar o build local do viewer, use `encode --local`.

## Script

```bash
python3 scripts/arch_url.py validate examples/pix.arch.yaml
python3 scripts/arch_url.py encode   examples/pix.arch.yaml
python3 scripts/arch_url.py decode   "<link>" -o plano.arch.yaml
python3 scripts/arch_url.py brief    "<link>" -o plano.arch.md   # em kind: system, a documentação em Markdown
python3 scripts/test_arch_url.py
```

Os testes do viewer geram `viewer/src/lib/__fixtures__/pix.ts.hash.txt`, que o teste Python lê, e o Python gera `pix.python.hash.txt`, que o viewer lê. Assim os dois lados ficam presos ao mesmo formato.
