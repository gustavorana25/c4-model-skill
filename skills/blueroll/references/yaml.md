# Regras do `arch.yaml`

Schema: `schema/arch.v1.json`. Exemplos completos: `examples/2fa.arch.yaml` (também em `2fa.en.arch.yaml` e `2fa.es.arch.yaml`), `examples/pix.arch.yaml` (plano) e `examples/loja.arch.yaml` (sistema).

Salve ao lado do plano como `<nome-do-plano>.arch.yaml`.

## Em qualquer notação

- **É a arquitetura do plano, não do sistema inteiro.** Inclua o que o plano cria, altera ou remove, mais o contexto mínimo para entender (quem chama, quem é chamado). Não modele o sistema todo.
- `status`: `new` / `changed` / `removed` / `unchanged` (padrão). Elementos de contexto ficam `unchanged`.
- Relações ligam os elementos **mais específicos** (code → code quando existe). O viewer agrega para os níveis acima.
- `steps`: um por passo do plano, mesma ordem e título. `touches` = elementos que o passo cria ou altera.
- `flows`: como o sistema **funciona** depois do plano (os `steps` dizem a ordem de construção; os `flows`, a ordem de execução). De 1 a 3 fluxos: o caminho principal e o de falha que mais importa (ex.: "Cliente paga com PIX", "QR Code expira"). Cada `hops[]` é `{from, to, label}` e precisa seguir uma relação existente, no sentido dela ou no contrário para uma resposta. Use os elementos mais específicos (code) e escreva o `label` como o que acontece ("salva o txid antes de chamar o PSP"), não o nome da relação. O viewer desce sozinho até o nível de cada salto.
- `constraints`: o que a implementação **precisa** respeitar, como regras verificáveis ("idempotência por txid", "migração aditiva, sem lock de tabela"), não descrições. Coloque onde há decisão que importa: contratos, fronteiras com sistemas externos, segurança, dados, migrações, regra de negócio central. O que não tem restrição fica a seu critério na execução.
- Se um contrato existe no repo, referencie em `relations[].contract`.
- **Idioma.** Escreva nomes, descrições, rótulos e fluxos no idioma da conversa, e declare-o em `lang` (`pt-BR`, `en` ou `es`; sem o campo, vale `pt-BR`). O `lang` define o idioma do brief, das mensagens do `validate` e dos rótulos dos tipos. O viewer mostra a interface no idioma de quem abre o link; o conteúdo aparece como você escreveu.

## Só em `notation: c4` (o padrão)

- Hierarquia: `person`, `system`, `external` na raiz; `container`, `database`, `queue` dentro de `system` (ou na raiz); `component` dentro de `container`, `database` (tabela, migração) ou `queue` (evento); `code` só dentro de `component`.
- **Tudo que o plano cria ou altera abre até o código.** Todo `system`, `container`, `database`, `queue` e `component` com `status` `new`/`changed` tem `children`, descendo até `code` (o `validate` avisa quando falta). O que não muda fica fechado: é contexto.
- Nível 4 (`code`): os arquivos, classes, módulos ou funções que o plano cria ou altera, com `path` preenchido. Arquivo que já existe e muda é `status: changed`. Liste o que muda, não o código todo do componente (2 a 4 por componente costuma bastar).
- Ícones de `component` e `code`: o viewer deduz o ícone do nome, do `tech` e do `path`. Por isso, use nomes que digam o que a peça é: "Tabela users", `ChallengeRepository`, `OrderPaid event`, `CheckoutPage`, `OrderController`, `db/migrations/x.sql`. Quando o nome não dá pista, o ícone vem do pai: component dentro de `database` vira tabela, dentro de `queue` vira evento. Só use `icon: <nome>` (da lista `icons` em `notations.json`) quando a dedução errar.

Nas outras notações, desça só até onde ajuda a entender (veja `references/notacoes.md`).
