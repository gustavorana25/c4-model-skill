---
name: c4-plan
description: Camada visual de arquitetura (estilo C4) para um plano de implementação. Use depois que um plano existir (plan mode ou skill de plano) e antes de executar, para o humano validar a estrutura num diagrama navegável e decidir quanta liberdade a IA tem em cada parte. Ative quando o usuário pedir "mostra a arquitetura do plano", "quero validar a estrutura", "gera o C4", "diagrama do plano", ou colar um link do viewer C4 Plan (contém "#v1.").
---

# C4 Plan

O humano valida **estrutura e fronteiras**; a IA executa **depois** do ok. Esta skill não substitui o plano: ela gera a camada visual dele e devolve à execução um brief com as decisões do humano.

Você nunca escreve HTML nem monta URL à mão. Você escreve **um YAML**; o script valida, gera o link e gera o brief.

```
plano ─► arch.yaml ─► encode ─► link ─► humano revisa no viewer ─► link editado ─► decode + brief ─► execução
```

Script: `python3 <dir-da-skill>/scripts/arch_url.py` (só stdlib + PyYAML; jsonschema opcional).

## 1. Gerar o `arch.yaml` a partir do plano

Salve ao lado do plano como `<nome-do-plano>.arch.yaml`. Schema: `schema/arch.v1.json`. Exemplo completo: `examples/pix.arch.yaml`.

Regras:
- **É a arquitetura do plano, não do sistema inteiro.** Inclua o que o plano cria, altera ou remove, mais o contexto mínimo para entender (quem chama, quem é chamado). Não modele o sistema todo.
- `status`: `new` / `changed` / `removed` / `unchanged` (padrão). Elementos de contexto ficam `unchanged`.
- Hierarquia C4: `person`, `system`, `external` na raiz; `container`, `database`, `queue` dentro de `system` (ou na raiz); `component` só dentro de `container`. Desça até `component` **só onde o plano mexe** e onde há decisão de design relevante. Nunca modele código (nível 4).
- Relações ligam os elementos **mais específicos** (component → component). O viewer agrega para os níveis acima.
- `steps`: um por passo do plano, mesma ordem e título. `touches` = elementos que o passo cria ou altera.
- `detail` é uma **proposta** sua; o humano decide no viewer:
  - `locked`: contratos públicos, fronteiras com sistemas externos, segurança, dados sensíveis, migrações de dados.
  - `guided`: lógica de negócio central; sempre com `constraints`.
  - `delegated`: UI, internals sem impacto em contrato, infraestrutura simples.
- `constraints`: regras verificáveis ("idempotência por txid"), não descrições.
- Se um contrato existe no repo, referencie em `relations[].contract`.

## 2. Validar e entregar o link

```bash
python3 scripts/arch_url.py encode <plano>.arch.yaml
```

- Erros: corrija o YAML e rode de novo. Não entregue link sem passar.
- Avisos: corrija se fizer sentido (ex.: `new` sem `detail`).
- Entregue o link ao humano em uma linha, com um resumo curto do que revisar (ex.: "3 elementos novos, 2 sem decisão de liberdade"). Peça para ele **Aprovar estrutura** e clicar em **Copiar link para a IA** quando terminar.

Viewer: `$C4PLAN_VIEWER_URL` se estiver definido (versão hospedada); senão o build local `viewer/dist/index.html` (arquivo único e autocontido; o link `file://` funciona num navegador comum). Se `viewer/dist/` não existir, avise o usuário que é preciso rodar `npm run build` em `viewer/` ou definir `C4PLAN_VIEWER_URL`.

## 2b. Se você tem um navegador embutido: escute a página

Se você tem ferramentas de navegador (o painel de browser do Claude Code, o browser do Cursor, Claude in Chrome), **abra o link lá** em vez de só entregá-lo, e escute a página enquanto o humano revisa. Assim perguntas feitas no diagrama são respondidas ali mesmo e o "Enviar" chega sem copiar e colar.

O link precisa ser `http(s)://`: alguns navegadores embutidos descartam o `#hash` de links `file://`. Sirva o `viewer/dist/` com qualquer servidor estático local (ex.: `python3 -m http.server`) ou use o `C4PLAN_VIEWER_URL`.

A página expõe `window.c4plan` (rode com a ferramenta de JavaScript do navegador):

| Chamada | Faz |
|---|---|
| `await c4plan.next(30000)` | Espera até 30s pelo próximo evento. Devolve o evento ou `null`. O máximo é 40s (a ferramenta corta em ~45s). |
| `await c4plan.state()` | Estado atual: `url`, `approved`, `selected` (o que o humano está olhando), `changes`, `pendingReview`, `openMessages`, `doc`. |
| `c4plan.reply(messageId, texto)` | Responde uma pergunta; aparece no painel do elemento. |
| `c4plan.load(urlOuHash)` | Troca o diagrama por uma versão nova sem recarregar a página. |
| `c4plan.stop()` | Avisa a página que você parou de escutar. |

Eventos de `next()`:
- `{event:"ask", messageId, elementId, elementName, text}`: pergunta sobre um elemento. Responda com `reply()`, curto e específico, e continue escutando.
- `{event:"change", messageId, elementId, elementName, text}`: pedido de mudança na estrutura. Altere o YAML, rode `encode`, chame `load(novoLink)` e `reply()` dizendo o que mudou. Continue escutando.
- `{event:"send", approved, changes, url}`: o humano terminou. Saia do loop e siga a seção 3 com esse `url`.

O loop:
1. Antes de começar, diga no chat, em uma linha: **"Abri o diagrama no navegador e vou escutar por até 10 minutos. Pergunte ou peça mudanças direto nos elementos; quando terminar, clique em Enviar para a IA."** Sem esse aviso o humano mexe na página, nada aparece no chat, e ele não entende o que está acontecendo.
2. Repita `await c4plan.next(30000)` e trate cada evento. `null` só significa "nada ainda": chame de novo, sem comentar no chat.
3. Pare quando chegar `send`, ou quando passar o tempo combinado (padrão: 10 minutos). No segundo caso, chame `c4plan.stop()` e diga no chat: **"Parei de escutar o diagrama. Quando terminar, diga 'pronto' (eu leio a página) ou cole o link."** A página passa a mostrar "IA não está escutando".
4. Se o humano mandar uma mensagem no chat enquanto você escuta, o loop acaba: responda a mensagem. Se ele disser "pronto", leia `await c4plan.state()` e siga a seção 3 com o `url`.
5. Se o humano perguntar no chat sobre "isso aqui" ou "esse elemento", leia `state().selected` para saber do que ele está falando.

Cada `next()` é uma chamada de ferramenta: não escute indefinidamente. Se o humano quiser mais tempo, ele pede.

## 3. Quando o humano devolver o link

```bash
python3 scripts/arch_url.py decode "<link>" -o <plano>.arch.yaml
python3 scripts/arch_url.py brief "<link>" -o <plano>.arch.md
```

1. Compare com a versão anterior do YAML e resuma para o humano **o que ele mudou** (liberdade, restrições, notas). Confirme seu entendimento das notas.
2. Se o humano mudou a **estrutura** (via notas pedindo isso), atualize o plano, gere o YAML e um link novo: volte ao passo 2.
3. Se `approved` não for `true`, não execute: diga o que falta. Elementos com `reviewed: true` foram conferidos pelo humano; os novos/alterados sem essa marca, cite no resumo como "não revisados".
4. Se aprovado, adicione ao plano uma referência ao `<plano>.arch.md` e siga para execução.

## 4. Executar respeitando o brief

O `<plano>.arch.md` é obrigatório durante a execução:
- `locked`: não altere estrutura, contrato, tecnologia nem nomes de fronteira. Se a implementação exigir, **pare e pergunte**.
- `guided`: siga todas as restrições; decisões fora delas, prefira o mais simples.
- `delegated`: livre no design interno; restrições listadas continuam valendo.
- Notas do revisor têm prioridade sobre sua proposta original.
- Ao final, compare o que foi implementado com o YAML e reporte divergências (componente novo não previsto, dependência fora das relações, contrato alterado).
