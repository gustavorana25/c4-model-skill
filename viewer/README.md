# Viewer do Blueroll

Front-end que abre os links gerados pela skill: Vite + React + TypeScript + Tailwind + React Flow + ELK. É estático e não vai junto com a skill. Quem usa a skill abre a versão publicada em https://gustavorana25.github.io/c4-model-skill/.

Este README é para quem mexe no viewer ou no script da skill. Para usar a skill, veja o [README da raiz](../README.md).

## Rodar

```bash
cd viewer
npm install
npm run dev      # http://localhost:5173
npm test         # codec (compatível com o Python) + lógica das views
npm run build    # gera dist/index.html: arquivo único, sem CDN
```

Da raiz do repositório também funciona: `npm run setup`, `npm run dev`, `npm test` e `npm run build` repassam os comandos para o `viewer/`.

`dist/index.html` funciona aberto direto do disco ou em qualquer host estático (GitHub Pages, Vercel, Netlify, S3, servidor interno).

## Publicação

O workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) testa, gera o build e publica no GitHub Pages a cada push no `main`. Para ativar num fork: **Settings → Pages → Source: GitHub Actions**.

O `arch_url.py encode` gera links para a versão publicada por padrão. Para outro host, defina `BLUEROLL_VIEWER_URL` (`C4PLAN_VIEWER_URL` ainda vale). Para testar o build local, use `encode --local`, que só funciona num clone deste repositório e depois do `npm run build`. Sirva o `dist/` por `http://` (ex.: `python3 -m http.server`), porque alguns navegadores embutidos descartam o `#hash` de links `file://`.

## Formato do link

```
<viewer>#v1.<base64url(deflate-raw(json))>[~<id da view aberta>]
```

O estado inteiro vai no `#hash`, que **não é enviado ao servidor**.

O codec existe em dois lugares, [`src/lib/codec.ts`](src/lib/codec.ts) e [`skills/blueroll/scripts/arch_url.py`](../skills/blueroll/scripts/arch_url.py), e um teste prende os dois ao mesmo formato. Os testes do viewer geram `src/lib/__fixtures__/pix.ts.hash.txt`, que o teste Python lê, e o Python gera `pix.python.hash.txt`, que o viewer lê.

## Modo iframe

`?embed` antes do `#hash` mostra só o diagrama, sem cabeçalho nem painel lateral, para colocar num `<iframe>` (wiki, docs, Notion):

```html
<iframe src="https://gustavorana25.github.io/c4-model-skill/?embed#v1.…" width="100%" height="520" style="border:0"></iframe>
```

Ficam as ações do diagrama: zoom, mover, enquadrar, abrir e fechar caixas, e o caminho de níveis quando o link abre dentro de uma caixa (`~id`). Saem seleção, comentários, passos, fluxos, minimapa, o filtro "Só mudanças" e a ponte `window.blueroll`. O `encode --embed` gera o link. O código fica em [`src/embed.ts`](src/embed.ts).

## Notações

Os tipos de caixa (rótulo, ícone, cor, aninhamento, nome dos níveis) vêm de [`skills/blueroll/schema/notations.json`](../skills/blueroll/schema/notations.json), que o viewer importa no build e o `arch_url.py` lê. [`src/lib/notation.ts`](src/lib/notation.ts) junta o preset de `notation` com os `types` do documento; os componentes só usam `typeMeta()` e `levelLabel()`. Ícone novo entra em `icons` no JSON e no mapa `ICONS` do `notation.ts` (um teste confere que os dois batem).

## Idiomas

A interface tem pt-BR, en e es. Os textos ficam em [`src/i18n/`](src/i18n/): `pt-BR.ts` é a fonte, e `en.ts` e `es.ts` precisam ter as mesmas chaves (o TypeScript e um teste cobram). Componentes usam `useT()`; código fora do React usa `t()`. O idioma vem do `localStorage`, senão do navegador, senão inglês. Os textos das notações traduzidos ficam em [`notations.i18n.json`](../skills/blueroll/schema/notations.i18n.json), ao lado do `notations.json` (que é o pt-BR). O conteúdo do diagrama não é traduzido.

## Script e testes do Python

Da raiz do repositório:

```bash
python3 skills/blueroll/scripts/arch_url.py validate skills/blueroll/examples/pix.arch.yaml
python3 skills/blueroll/scripts/arch_url.py encode   skills/blueroll/examples/pix.arch.yaml
python3 skills/blueroll/scripts/arch_url.py decode   "<link>" -o plano.arch.yaml
python3 skills/blueroll/scripts/arch_url.py brief    "<link>" -o plano.arch.md   # em kind: system, a documentação em Markdown
python3 tests/test_arch_url.py
```

## Nesta máquina (Windows)

| Ferramenta | Onde está |
|---|---|
| Node 26 LTS + npm 11 | `C:\Users\gusta\AppData\Local\Programs\nodejs` (no PATH do usuário) |
| Python 3.12 + PyYAML | **Só no WSL** (`Ubuntu-24.04`). No Windows não há Python. |

Script Python pelo WSL:

```powershell
wsl -d Ubuntu-24.04 --cd /mnt/c/Users/gusta/workspace/c4model -- python3 skills/blueroll/scripts/arch_url.py encode skills/blueroll/examples/pix.arch.yaml
wsl -d Ubuntu-24.04 --cd /mnt/c/Users/gusta/workspace/c4model -- python3 tests/test_arch_url.py
```

**Problemas comuns**

- `npm` não reconhecido: o terminal foi aberto antes do Node entrar no PATH. Feche e reabra o app/terminal, ou chame pelo caminho completo: `& "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd" run dev`.
- `ENOENT package.json`: você está fora da raiz do projeto ou do `viewer/`.
- `&&` dá erro: o PowerShell 5.1 não aceita `&&`; use `;` ou rode um comando por vez.
- Erro de binário nativo (rolldown, tailwind oxide, lightningcss) ao trocar entre WSL e Windows: reinstale com `npm run setup` no sistema em que vai rodar.
- Porta 5173 ocupada: já existe um `npm run dev` aberto; pare com Ctrl+C ou o Vite usa a 5174.
