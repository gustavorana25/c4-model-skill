# Notações

`notation` define quais tipos de caixa existem, quem pode ficar dentro de quem, os ícones e os nomes dos níveis. Os presets ficam em `schema/notations.json`. Escolha antes de escrever o YAML:

| Pedido | `notation` | Tipos |
|---|---|---|
| Arquitetura de software, plano de implementação (o padrão; pode omitir) | `c4` | person, system, external, container, database, queue, component, code |
| Processo de negócio, fluxograma, "como funciona o reembolso" | `processo` | raia, ator, sistema, inicio, etapa, decisao, espera, documento, fim, subprocesso |
| Deploy, nuvem, rede, "onde roda o quê" | `infra` | usuario, externo, nuvem, regiao, rede, cluster, borda, servico, funcao, banco, fila, storage, segredo |
| Modelagem de domínio, contextos, eventos | `dominio` | ator, externo, contexto, agregado, entidade, valor, comando, evento, politica, leitura |
| Jornada do usuário até uma feature, funil, onboarding de produto | `jornada` | persona, canal, fase, tela, acao, decisao, saida, objetivo |
| Nada acima serve | `livre` + `types` | ator, grupo, item, dado, externo, mais os seus |

## Tipos próprios

Quando faltar um tipo, declare em `types` (somam ao preset; o mesmo id substitui o do preset):

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

Em qualquer elemento, `icon: <nome>` troca o ícone só daquele elemento.

Outros campos de `types`: `inside` (nome do nível quando o diagrama abre o tipo), `openable` (avisar se algo novo desse tipo não tem children), `autoOpen: false` (começa fechado), `card` (base, raised, deep).

## O que muda entre notações

Só os tipos. `status`, `steps`, `flows`, `constraints`, relações entre os elementos mais específicos e a escuta da página seguem as mesmas regras (`references/yaml.md`). As regras de C4 (abrir até `code`, `path` em código) valem só para `c4`. Nas outras, desça só até onde ajuda a entender.

Exemplos: `examples/aws.arch.yaml` (infra com dois tipos próprios, documentação) e `examples/jornada.arch.yaml` (jornada até uma feature).
