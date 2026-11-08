---
name: blueroll
description: Diagrama navegável de caixas aninhadas e setas, com fluxos salto a salto. Arquitetura de software em C4 por padrão, e também fluxograma de processo, infraestrutura, domínio ou tipos próprios. Dois usos. (1) Plano de implementação: depois que um plano existir e antes de executar, para o humano ver como o plano afeta o que existe hoje, tirar dúvidas e pedir mudanças antes de aprovar no chat. (2) Documentar o sistema como é hoje, a partir do código, para onboarding ou para entender um repositório. Ative quando o usuário pedir "mostra a arquitetura do plano", "quero validar a estrutura", "gera o C4", "diagrama do plano", "documenta a arquitetura", "explica como o sistema funciona", "mapa do sistema", "onboarding do repo", "desenha o processo", "fluxograma", "mapa da infra", "diagrama de domínio", "blueroll", ou colar um link do viewer Blueroll ou C4 Plan (contém "#v1.").
---

# Blueroll

O humano entende **estrutura e fronteiras** do plano; a IA executa **depois** do ok no chat. Esta skill não substitui o plano: ela gera a camada visual dele e um brief para a execução.

O vocabulário de caixas é escolhido por `notation` (seção 1b): C4 para software, mas também processo, infra, domínio ou tipos próprios.

Ela também **documenta o sistema como é hoje** (`kind: system`): o mesmo diagrama e os mesmos fluxos, sem status, passos nem aprovação. Veja a seção 5.

**O chat é a fonte da verdade.** O viewer só mostra o plano: o humano não edita nada lá. Dúvidas e pedidos de mudança chegam como comentários (ou colados no chat), você responde no chat, e toda mudança passa pelo YAML.

Você nunca escreve HTML nem monta URL à mão. Você escreve **um YAML**; o script valida, gera o link e gera o brief.

```
plano ─► arch.yaml ─► encode ─► link ─► humano olha e comenta ─► você ajusta o YAML ─► ok no chat ─► brief ─► execução
```

Script: `python3 <dir-da-skill>/scripts/arch_url.py` (só stdlib + PyYAML; jsonschema opcional).

## 1. Gerar o `arch.yaml` a partir do plano

Salve ao lado do plano como `<nome-do-plano>.arch.yaml`. Schema: `schema/arch.v1.json`. Exemplos completos: `examples/2fa.arch.yaml` (também em `2fa.en.arch.yaml` e `2fa.es.arch.yaml`) e `examples/pix.arch.yaml`.

Regras:
- **É a arquitetura do plano, não do sistema inteiro.** Inclua o que o plano cria, altera ou remove, mais o contexto mínimo para entender (quem chama, quem é chamado). Não modele o sistema todo.
- `status`: `new` / `changed` / `removed` / `unchanged` (padrão). Elementos de contexto ficam `unchanged`.
- Hierarquia C4: `person`, `system`, `external` na raiz; `container`, `database`, `queue` dentro de `system` (ou na raiz); `component` dentro de `container`, `database` (tabela, migração) ou `queue` (evento); `code` só dentro de `component`.
- **Tudo que o plano cria ou altera abre até o código.** Todo `system`, `container`, `database`, `queue` e `component` com `status` `new`/`changed` tem `children`, descendo até `code` (o `validate` avisa quando falta). O que não muda fica fechado: é contexto.
- Nível 4 (`code`): os arquivos, classes, módulos ou funções que o plano cria ou altera, com `path` preenchido. Arquivo que já existe e muda é `status: changed`. Liste o que muda, não o código todo do componente (2 a 4 por componente costuma bastar).
- Relações ligam os elementos **mais específicos** (code → code quando existe). O viewer agrega para os níveis acima.
- `steps`: um por passo do plano, mesma ordem e título. `touches` = elementos que o passo cria ou altera.
- `flows`: como o sistema **funciona** depois do plano (os `steps` dizem a ordem de construção; os `flows`, a ordem de execução). De 1 a 3 fluxos: o caminho principal e o de falha que mais importa (ex.: "Cliente paga com PIX", "QR Code expira"). Cada `hops[]` é `{from, to, label}` e precisa seguir uma relação existente, no sentido dela ou no contrário para uma resposta. Use os elementos mais específicos (code) e escreva o `label` como o que acontece ("salva o txid antes de chamar o PSP"), não o nome da relação. O viewer desce sozinho até o nível de cada salto.
- `constraints`: o que a implementação **precisa** respeitar, como regras verificáveis ("idempotência por txid", "migração aditiva, sem lock de tabela"), não descrições. Coloque onde há decisão que importa: contratos, fronteiras com sistemas externos, segurança, dados, migrações, regra de negócio central. O que não tem restrição fica a seu critério na execução.
- Se um contrato existe no repo, referencie em `relations[].contract`.
- **Idioma.** Escreva nomes, descrições, rótulos e fluxos no idioma da conversa, e declare-o em `lang` (`pt-BR`, `en` ou `es`; sem o campo, vale `pt-BR`). O `lang` define o idioma do brief, das mensagens do `validate` e dos rótulos dos tipos. O viewer mostra a interface no idioma de quem abre o link; o conteúdo aparece como você escreveu.

## 1b. Escolher a notação

`notation` define quais tipos de caixa existem, quem pode ficar dentro de quem, os ícones e os nomes dos níveis. Os presets ficam em `schema/notations.json`. Escolha antes de escrever o YAML:

| Pedido | `notation` | Tipos |
|---|---|---|
| Arquitetura de software, plano de implementação (o padrão; pode omitir) | `c4` | person, system, external, container, database, queue, component, code |
| Processo de negócio, fluxograma, "como funciona o reembolso" | `processo` | raia, ator, sistema, inicio, etapa, decisao, espera, documento, fim, subprocesso |
| Deploy, nuvem, rede, "onde roda o quê" | `infra` | usuario, externo, nuvem, regiao, rede, cluster, borda, servico, funcao, banco, fila, storage, segredo |
| Modelagem de domínio, contextos, eventos | `dominio` | ator, externo, contexto, agregado, entidade, valor, comando, evento, politica, leitura |
| Jornada do usuário até uma feature, funil, onboarding de produto | `jornada` | persona, canal, fase, tela, acao, decisao, saida, objetivo |
| Nada acima serve | `livre` + `types` | ator, grupo, item, dado, externo, mais os seus |

**Tipos próprios.** Quando faltar um tipo, declare em `types` (somam ao preset; o mesmo id substitui o do preset):

```yaml
notation: infra
types:
  - id: time
    label: Time
    icon: users        # um nome da lista icons em notations.json
    color: pink        # indigo, blue, azure, sky, teal, cyan, violet, pink, gray ou #RRGGBB
    parents: [null]    # onde pode ficar: null = raiz, "*" = qualquer lugar (padrão), ou ids de tipos
    context: true      # ator ou peça de fora: o plano não implementa
```

Outros campos: `inside` (nome do nível quando o diagrama abre o tipo), `openable` (avisar se algo novo desse tipo não tem children), `autoOpen: false` (começa fechado), `card` (base, raised, deep).

Em tudo que não é tipo, as regras são as mesmas em qualquer notação: `status`, `steps`, `flows`, `constraints`, relações entre os elementos mais específicos e a escuta da página. As regras de C4 da seção 1 (abrir até `code`, `path` em código) valem para `c4`. Nas outras, desça só até onde ajuda a entender. Exemplos: `examples/aws.arch.yaml` (infra com dois tipos próprios, documentação) e `examples/jornada.arch.yaml` (jornada até uma feature).

## 2. Validar e entregar o link

```bash
python3 scripts/arch_url.py encode <plano>.arch.yaml
```

- Erros: corrija o YAML e rode de novo. Não entregue link sem passar.
- Avisos: corrija se fizer sentido (ex.: algo novo que não abre até o código).
- Entregue o link ao humano em uma linha, com um resumo curto do que o plano muda (ex.: "3 elementos novos, 2 alterados"). Diga que ele pode apertar **C** (ou **Comentar**), clicar nos cards e perguntar ou pedir mudança, e que a aprovação é aqui no chat.

Viewer: o `encode` gera links para a versão publicada, https://gustavorana25.github.io/c4-model-skill/ (estática; o plano vai no `#hash` e não chega ao servidor). `$BLUEROLL_VIEWER_URL` troca o host.

## 2b. Se você tem um navegador embutido: escute a página

Se você tem ferramentas de navegador (o painel de browser do Claude Code, o browser do Cursor, Claude in Chrome), **abra o link lá** em vez de só entregá-lo, e escute a página enquanto o humano olha o plano.

**O chat é a fonte da verdade.** A página é só um atalho: o humano aponta um ou mais cards e comenta, e você **responde no chat**, nunca na página. A única coisa que você muda na página é o plano, com `load()`, quando a conversa alterar a estrutura.

Abra o link gerado pelo `encode` como está: ele já é `https://`.

A página expõe `window.blueroll` (`window.c4plan` é o mesmo objeto, nome antigo) (rode com a ferramenta de JavaScript do navegador):

| Chamada | Faz |
|---|---|
| `await blueroll.next(30000)` | Espera até 30s pelo próximo evento. Devolve o evento ou `null`. O máximo é 40s (a ferramenta corta em ~45s). |
| `await blueroll.state()` | Estado atual: `url`, `plan`, `focus` (nível aberto), `selected` (o que o humano está olhando), `idleMs` (há quanto tempo ele não mexe na página), `doc`. |
| `blueroll.load(urlOuHash)` | Troca o diagrama por uma versão nova sem recarregar a página. |
| `blueroll.stop()` | Avisa a página que você parou de escutar. |

Eventos de `next()`:
- `{event:"comment", targets:[{id,name}], view, text}`: o humano comentou sobre esses elementos (pode ser nenhum, um ou vários; `view` é o nível aberto). Responda **no chat**, abrindo com os nomes: "Sobre **API Pix** e **Fila de liquidação**: …". Se for pedido de mudança, altere o YAML, rode `encode`, chame `load(novoLink)` e diga no chat o que mudou. Depois continue escutando.
- `{event:"stop", reason:"idle"}`: o humano ficou 10 minutos sem mexer na página e a escuta acabou sozinha. Diga a frase de parada (passo 3) e saia do loop.

O loop:
1. Antes de começar, diga no chat, em uma linha: **"Abri o diagrama no navegador e estou escutando enquanto você mexer nele. Aperte C (ou Comentar), clique nos cards e escreva: eu respondo aqui. Quando estiver tudo certo, me diga aqui que aprova."** Sem esse aviso o humano mexe na página, nada aparece no chat, e ele não entende o que está acontecendo.
2. Repita `await blueroll.next(30000)` e trate cada evento. `null` só significa "nada ainda": chame de novo, sem comentar no chat. A escuta dura enquanto o humano interagir com a página (cada clique, tecla ou rolagem zera o relógio); quem decide o fim é a página, com `stop`.
3. Pare quando chegar `stop`. No `stop`, diga no chat: **"Parei de escutar o diagrama porque ficou parado. Comente no chat quando quiser, ou peça para eu escutar de novo."** Se você precisar parar antes por outro motivo, chame `blueroll.stop()` e diga o mesmo.
4. Se o humano mandar uma mensagem no chat enquanto você escuta, o loop acaba: responda a mensagem. Depois leia `(await blueroll.state()).idleMs`: se for menor que 10 minutos, ele ainda está na página, então **volte ao loop** sem avisar de novo. Se ele aprovar, chame `blueroll.stop()` e siga a seção 3.
5. Se o humano perguntar no chat sobre "isso aqui" ou "esse elemento", leia `state().selected` para saber do que ele está falando.
6. Sem você escutando, o botão de comentar copia um texto como `Sobre "API Pix" (pix-api) no diagrama: …` para o humano colar no chat. Os ids entre parênteses são os do YAML.

## 3. Quando o humano aprovar no chat

Só ele aprova, e só no chat ("aprovado", "pode seguir", "ok, executa"). Silêncio, fim da escuta ou ausência de comentários não é aprovação.

1. Marque `approved: true` no `<plano>.arch.yaml` e gere o brief a partir do arquivo:
   ```bash
   python3 scripts/arch_url.py brief <plano>.arch.yaml -o <plano>.arch.md
   ```
2. Resuma em poucas linhas o que mudou desde o primeiro link por causa da conversa (restrições, estrutura, fluxos).
3. Adicione ao plano uma referência ao `<plano>.arch.md` e siga para a execução.

Se o humano colar um link do viewer (por exemplo, aberto num navegador comum), ele só serve para ver: a versão que vale é o seu `<plano>.arch.yaml`.

## 4. Executar respeitando o brief

O `<plano>.arch.md` é obrigatório durante a execução:
- Siga a estrutura (elementos, relações, fluxos) e todas as restrições. Se a implementação exigir mudar a estrutura ou quebrar uma restrição, **pare e pergunte**.
- Contratos referenciados (`contract`) não mudam sem perguntar.
- Fora das restrições, prefira o mais simples e siga o padrão do código existente.
- O que o humano pediu no chat tem prioridade sobre sua proposta original.
- Ao final, compare o que foi implementado com o YAML e reporte divergências (componente novo não previsto, dependência fora das relações, contrato alterado).

## 5. Documentar o sistema como é hoje (`kind: system`)

Quando o pedido é entender ou documentar o que já existe ("documenta a arquitetura", "como esse sistema funciona", onboarding), não há plano: você lê o repositório e gera o mesmo YAML com `kind: system`. Exemplo completo: `examples/loja.arch.yaml`.

```yaml
version: 1
kind: system
title: Loja Online
description: Uma ou duas frases sobre o que o sistema faz.
```

Como montar:
- **Leia antes de escrever.** Pontos de entrada (rotas, handlers, consumers, jobs), manifests (`package.json`, `docker-compose`, infra), migrações e clientes de serviços externos dizem quais são os containers, bancos, filas e externos. Não invente peças que o código não mostra; se algo for incerto, diga no chat.
- **Sem `status`, `steps` e `approved`.** Tudo é o sistema como está (o `validate` avisa se sobrar algum).
- **Fluxos são o principal.** De 2 a 4: o caminho que mais importa para o negócio, a principal tarefa em segundo plano e o caso de falha mais comum. É por eles que quem chega entende o sistema.
- **Profundidade:** desça até `code` só no que os fluxos atravessam, com `path` real (confira que o arquivo existe). O resto fica em `container` ou `component`, fechado.
- `constraints` viram as **regras da casa** que quem mexe precisa saber (idempotência, quem pode escrever em qual tabela, contrato que não muda).
- Relações e fluxos seguem as mesmas regras do plano (seção 1).

Entrega: `encode` gera o link como no plano. Diga em uma linha o que o sistema tem ("5 containers, 2 externos, 2 fluxos") e que dá para seguir os fluxos na aba Fluxos e perguntar com **C**. Se tiver navegador, escute a página (seção 2b): os comentários são perguntas, que você responde no chat, ou correções da documentação, que você aplica no YAML e recarrega com `load()`.

Para um texto versionável no repositório, `brief` gera a documentação em Markdown (elementos, relações e fluxos):

```bash
python3 scripts/arch_url.py brief docs/arquitetura.arch.yaml -o docs/arquitetura.md
```

Mais tarde, um plano sobre esse sistema pode partir desse YAML: copie, troque `kind` para `plan` e marque o que muda com `status`.
