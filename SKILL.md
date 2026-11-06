---
name: c4-plan
description: Camada visual de arquitetura (estilo C4) para um plano de implementação. Use depois que um plano existir (plan mode ou skill de plano) e antes de executar, para o humano ver num diagrama navegável como o plano afeta o que existe hoje, tirar dúvidas e pedir mudanças antes de aprovar no chat. Ative quando o usuário pedir "mostra a arquitetura do plano", "quero validar a estrutura", "gera o C4", "diagrama do plano", ou colar um link do viewer C4 Plan (contém "#v1.").
---

# C4 Plan

O humano entende **estrutura e fronteiras** do plano; a IA executa **depois** do ok no chat. Esta skill não substitui o plano: ela gera a camada visual dele e um brief para a execução.

**O chat é a fonte da verdade.** O viewer só mostra o plano: o humano não edita nada lá. Dúvidas e pedidos de mudança chegam como comentários (ou colados no chat), você responde no chat, e toda mudança passa pelo YAML.

Você nunca escreve HTML nem monta URL à mão. Você escreve **um YAML**; o script valida, gera o link e gera o brief.

```
plano ─► arch.yaml ─► encode ─► link ─► humano olha e comenta ─► você ajusta o YAML ─► ok no chat ─► brief ─► execução
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
- `detail` diz quanta liberdade você terá; o humano vê no viewer e pede mudança se discordar:
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
- Entregue o link ao humano em uma linha, com um resumo curto do que o plano muda (ex.: "3 elementos novos, 2 alterados"). Diga que ele pode apertar **C** (ou **Comentar**), clicar nos cards e perguntar ou pedir mudança, e que a aprovação é aqui no chat.

Viewer: `$C4PLAN_VIEWER_URL` se estiver definido (versão hospedada); senão o build local `viewer/dist/index.html` (arquivo único e autocontido; o link `file://` funciona num navegador comum). Se `viewer/dist/` não existir, avise o usuário que é preciso rodar `npm run build` em `viewer/` ou definir `C4PLAN_VIEWER_URL`.

## 2b. Se você tem um navegador embutido: escute a página

Se você tem ferramentas de navegador (o painel de browser do Claude Code, o browser do Cursor, Claude in Chrome), **abra o link lá** em vez de só entregá-lo, e escute a página enquanto o humano olha o plano.

**O chat é a fonte da verdade.** A página é só um atalho: o humano aponta um ou mais cards e comenta, e você **responde no chat**, nunca na página. A única coisa que você muda na página é o plano, com `load()`, quando a conversa alterar a estrutura.

O link precisa ser `http(s)://`: alguns navegadores embutidos descartam o `#hash` de links `file://`. Sirva o `viewer/dist/` com qualquer servidor estático local (ex.: `python3 -m http.server`) ou use o `C4PLAN_VIEWER_URL`.

A página expõe `window.c4plan` (rode com a ferramenta de JavaScript do navegador):

| Chamada | Faz |
|---|---|
| `await c4plan.next(30000)` | Espera até 30s pelo próximo evento. Devolve o evento ou `null`. O máximo é 40s (a ferramenta corta em ~45s). |
| `await c4plan.state()` | Estado atual: `url`, `plan`, `focus` (nível aberto), `selected` (o que o humano está olhando), `idleMs` (há quanto tempo ele não mexe na página), `doc`. |
| `c4plan.load(urlOuHash)` | Troca o diagrama por uma versão nova sem recarregar a página. |
| `c4plan.stop()` | Avisa a página que você parou de escutar. |

Eventos de `next()`:
- `{event:"comment", targets:[{id,name}], view, text}`: o humano comentou sobre esses elementos (pode ser nenhum, um ou vários; `view` é o nível aberto). Responda **no chat**, abrindo com os nomes: "Sobre **API Pix** e **Fila de liquidação**: …". Se for pedido de mudança, altere o YAML, rode `encode`, chame `load(novoLink)` e diga no chat o que mudou. Depois continue escutando.
- `{event:"stop", reason:"idle"}`: o humano ficou 10 minutos sem mexer na página e a escuta acabou sozinha. Diga a frase de parada (passo 3) e saia do loop.

O loop:
1. Antes de começar, diga no chat, em uma linha: **"Abri o diagrama no navegador e estou escutando enquanto você mexer nele. Aperte C (ou Comentar), clique nos cards e escreva: eu respondo aqui. Quando estiver tudo certo, me diga aqui que aprova."** Sem esse aviso o humano mexe na página, nada aparece no chat, e ele não entende o que está acontecendo.
2. Repita `await c4plan.next(30000)` e trate cada evento. `null` só significa "nada ainda": chame de novo, sem comentar no chat. A escuta dura enquanto o humano interagir com a página (cada clique, tecla ou rolagem zera o relógio); quem decide o fim é a página, com `stop`.
3. Pare quando chegar `stop`. No `stop`, diga no chat: **"Parei de escutar o diagrama porque ficou parado. Comente no chat quando quiser, ou peça para eu escutar de novo."** Se você precisar parar antes por outro motivo, chame `c4plan.stop()` e diga o mesmo.
4. Se o humano mandar uma mensagem no chat enquanto você escuta, o loop acaba: responda a mensagem. Depois leia `(await c4plan.state()).idleMs`: se for menor que 10 minutos, ele ainda está na página, então **volte ao loop** sem avisar de novo. Se ele aprovar, chame `c4plan.stop()` e siga a seção 3.
5. Se o humano perguntar no chat sobre "isso aqui" ou "esse elemento", leia `state().selected` para saber do que ele está falando.
6. Sem você escutando, o botão de comentar copia um texto como `Sobre "API Pix" (pix-api) no diagrama: …` para o humano colar no chat. Os ids entre parênteses são os do YAML.

## 3. Quando o humano aprovar no chat

Só ele aprova, e só no chat ("aprovado", "pode seguir", "ok, executa"). Silêncio, fim da escuta ou ausência de comentários não é aprovação.

1. Marque `approved: true` no `<plano>.arch.yaml` e gere o brief a partir do arquivo:
   ```bash
   python3 scripts/arch_url.py brief <plano>.arch.yaml -o <plano>.arch.md
   ```
2. Resuma em poucas linhas o que mudou desde o primeiro link por causa da conversa (liberdade, restrições, estrutura).
3. Adicione ao plano uma referência ao `<plano>.arch.md` e siga para a execução.

Se o humano colar um link do viewer (por exemplo, aberto num navegador comum), ele só serve para ver: a versão que vale é o seu `<plano>.arch.yaml`.

## 4. Executar respeitando o brief

O `<plano>.arch.md` é obrigatório durante a execução:
- `locked`: não altere estrutura, contrato, tecnologia nem nomes de fronteira. Se a implementação exigir, **pare e pergunte**.
- `guided`: siga todas as restrições; decisões fora delas, prefira o mais simples.
- `delegated`: livre no design interno; restrições listadas continuam valendo.
- O que o humano pediu no chat tem prioridade sobre sua proposta original.
- Ao final, compare o que foi implementado com o YAML e reporte divergências (componente novo não previsto, dependência fora das relações, contrato alterado).
