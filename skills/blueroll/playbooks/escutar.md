# Escutar a página

**A página é só um atalho; a conversa acontece no chat.** O humano aponta cards e comenta; você responde no chat, nunca na página. A única coisa que você muda na página é o diagrama, com `load()`.

Quando: você tem ferramentas de navegador (o painel de browser do Claude Code, o browser do Cursor, Claude in Chrome) e acabou de gerar um link. Sem navegador, este playbook não se aplica: o botão de comentar copia um texto para o humano colar no chat.

A página expõe `window.blueroll` (`window.c4plan` é o mesmo objeto, nome antigo). Rode com a ferramenta de JavaScript do navegador:

| Chamada | Faz |
|---|---|
| `await blueroll.next(30000)` | Espera até 30s pelo próximo evento. Devolve o evento ou `null`. O máximo é 40s (a ferramenta corta em ~45s). |
| `await blueroll.state()` | Estado atual: `url`, `plan`, `focus` (nível aberto), `selected` (o que o humano está olhando), `idleMs` (há quanto tempo ele não mexe na página), `doc`. |
| `blueroll.load(urlOuHash)` | Troca o diagrama por uma versão nova sem recarregar a página. |
| `blueroll.stop()` | Avisa a página que você parou de escutar. |

Eventos de `next()`:
- `{event:"comment", targets:[{id,name}], view, text}`: o humano comentou sobre esses elementos (pode ser nenhum, um ou vários; `view` é o nível aberto).
- `{event:"stop", reason:"idle"}`: o humano ficou 10 minutos sem mexer na página e a escuta acabou sozinha.

Passos:

1. Abra o link gerado pelo `encode` como está (ele já é `https://`).
2. Antes de escutar, diga no chat, em uma linha: **"Abri o diagrama no navegador e estou escutando enquanto você mexer nele. Aperte C (ou Comentar), clique nos cards e escreva: eu respondo aqui. Quando estiver tudo certo, me diga aqui que aprova."** Sem esse aviso o humano mexe na página, nada aparece no chat, e ele não entende o que está acontecendo.
3. Repita `await blueroll.next(30000)`. `null` só significa "nada ainda": chame de novo, sem comentar no chat. A escuta dura enquanto o humano interagir com a página (cada clique, tecla ou rolagem zera o relógio); quem decide o fim é a página, com `stop`.
4. Num `comment`, responda **no chat**, abrindo com os nomes: "Sobre **API Pix** e **Fila de liquidação**: …". Se for pedido de mudança, altere o YAML, rode `encode`, chame `load(novoLink)` e diga no chat o que mudou. Volte ao passo 3.
5. Se o humano perguntar no chat sobre "isso aqui" ou "esse elemento", leia `(await blueroll.state()).selected` para saber do que ele está falando.
6. Se o humano mandar uma mensagem no chat enquanto você escuta, o loop acaba: responda a mensagem. Depois leia `(await blueroll.state()).idleMs`: se for menor que 10 minutos, ele ainda está na página, então volte ao passo 3 sem avisar de novo. Se a mensagem for a aprovação, chame `blueroll.stop()` e volte ao playbook que chamou este.
7. Quando chegar `stop`, diga no chat: **"Parei de escutar o diagrama porque ficou parado. Comente no chat quando quiser, ou peça para eu escutar de novo."** Se você precisar parar antes por outro motivo, chame `blueroll.stop()` e diga o mesmo.

Sem você escutando, o botão de comentar copia um texto como `Sobre "API Pix" (pix-api) no diagrama: …` para o humano colar no chat. Os ids entre parênteses são os do YAML.

Se uma IA já escutou aquela aba, o texto colado termina com **"Depois de responder, volte a escutar a página do diagrama."** (em inglês, "After replying, go back to listening to the diagram page."; em espanhol, "Después de responder, vuelve a escuchar la página del diagrama."). Responda o comentário no chat, como no passo 4, e volte ao passo 3 dizendo só, em uma linha, **"Voltei a escutar o diagrama."** Se a aba não estiver mais aberta no seu navegador, abra de novo o link do YAML atual e siga do passo 2.

**Resposta:** cada comentário respondido no chat, abrindo com os nomes dos elementos; cada mudança dita no chat junto com o `load()`.
