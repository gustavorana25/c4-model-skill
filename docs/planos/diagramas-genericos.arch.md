# Arquitetura do plano: Diagramas além do C4 (notações)

> ✅ Estrutura **aprovada** pelo humano.

O motor do viewer já é genérico: caixas aninhadas, relações agregadas por nível, fluxos salto a salto, passos, diff de status e comentários. O que prende ao C4 é o vocabulário: a lista fixa de 8 tipos, as regras de aninhamento, os nomes "Nível 1..4" e alguns contadores. O plano troca esse vocabulário fixo por uma "notação": presets prontos (c4, processo, infra, domínio) e tipos customizados declarados no próprio YAML. Links e YAMLs de hoje continuam funcionando como c4.

## Regras

- Restrições são obrigatórias. Se a implementação exigir quebrar uma, PARE e pergunte.
- Contratos referenciados (`contract`) não mudam sem perguntar.
- Fora das restrições, prefira o mais simples e siga o padrão do código existente.
- Notas do revisor são instruções do humano e têm prioridade.

## Passos

### 1. Definir presets de notação em notations.json, com c4 idêntico ao de hoje

- **notations.json** (`notations-json` · código · novo)
  - Arquivo: `skills/blueroll/schema/notations.json`
  - Restrição: O preset c4 reproduz exatamente TYPE_META, ALLOWED_PARENTS e os nomes de nível atuais

Relações envolvidas:
- load_notation() → notations.json · carrega o preset
- arch.v1.json → notations.json · enum de presets
- reembolso.arch.yaml → notations.json · usa notation processo
- infra.arch.yaml → notations.json · usa infra + types próprios
- notation.ts → notations.json · importa os presets no build (novo)

### 2. Schema aceita notation e types, mantendo version 1

- **arch.v1.json** (`schema` · código · alterado)
  - Arquivo: `skills/blueroll/schema/arch.v1.json`
  - Restrição: Mudança aditiva; continua version 1 e hash "#v1."
  - Restrição: Sem notation, o documento é c4 e valida exatamente como hoje

Relações envolvidas:
- validate() → arch.v1.json · valida a estrutura (jsonschema)
- arch.v1.json → notations.json · enum de presets

### 3. arch_url.py valida e gera brief a partir da notação

- **load_notation()** (`load-notation` · código · novo)
  - Arquivo: `skills/blueroll/scripts/arch_url.py`
  - Restrição: Tipo próprio com o mesmo id de um tipo do preset sobrescreve o do preset
- **validate()** (`validate` · código · alterado)
  - Arquivo: `skills/blueroll/scripts/arch_url.py`
- **brief() / system_doc()** (`brief-fn` · código · alterado)
  - Arquivo: `skills/blueroll/scripts/arch_url.py`

Relações envolvidas:
- Agente de código → validate() · roda encode no YAML · CLI
- validate() → load_notation() · pede o vocabulário do documento
- load_notation() → notations.json · carrega o preset
- validate() → arch.v1.json · valida a estrutura (jsonschema)
- Agente de código → brief() / system_doc() · gera o brief depois do ok · CLI
- brief() / system_doc() → load_notation() · nomes dos tipos
- test_arch_url.py → validate() · valida exemplos e compara hash

### 4. notation.ts no viewer e troca de ElementType por string

- **notation.ts** (`notation-ts` · código · novo)
  - Arquivo: `viewer/src/lib/notation.ts`
  - Restrição: Nenhum componente acessa TYPE_META[el.type] direto; tudo passa por aqui
- **types.ts** (`types-ts` · código · alterado)
  - Arquivo: `viewer/src/lib/types.ts`
- **meta.ts** (`meta-ts` · código · alterado)
  - Arquivo: `viewer/src/lib/meta.ts`
- **notation.test.ts** (`notation-test` · código · novo)
  - Arquivo: `viewer/src/lib/notation.test.ts`

Relações envolvidas:
- Canvas.tsx → notation.ts · nome do nível
- ElementNode.tsx / BoundaryNode.tsx → notation.ts · rótulo, ícone e cor do tipo
- defaultExpanded() → notation.ts · profundidade da notação
- Summary.tsx → notation.ts · tipos para contar
- implementable() → notation.ts · flag de implementável
- notation.ts → notations.json · importa os presets no build (novo)
- notation.ts → types.ts · tipos do documento
- notation.ts → meta.ts · ícone de container (só c4)
- notation.test.ts → notation.ts · testa c4, custom e desconhecido

### 5. Canvas, cards, resumo e abertura inicial leem a notação

- **Canvas.tsx** (`canvas-tsx` · código · alterado)
  - Arquivo: `viewer/src/components/canvas/Canvas.tsx`
- **ElementNode.tsx / BoundaryNode.tsx** (`element-node` · código · alterado)
  - Arquivo: `viewer/src/components/canvas/ElementNode.tsx`
- **defaultExpanded()** (`view-ts` · código · alterado)
  - Arquivo: `viewer/src/lib/view.ts`
- **Summary.tsx** (`summary-tsx` · código · alterado)
  - Arquivo: `viewer/src/components/sidebar/Summary.tsx`
- **implementable()** (`model-ts` · código · alterado)
  - Arquivo: `viewer/src/lib/model.ts`

Relações envolvidas:
- App.tsx / ui.tsx → Canvas.tsx · monta o diagrama
- Canvas.tsx → defaultExpanded() · calcula o que abrir
- Canvas.tsx → ElementNode.tsx / BoundaryNode.tsx · renderiza os cards
- Canvas.tsx → notation.ts · nome do nível
- ElementNode.tsx / BoundaryNode.tsx → notation.ts · rótulo, ícone e cor do tipo
- defaultExpanded() → notation.ts · profundidade da notação
- Summary.tsx → notation.ts · tipos para contar
- implementable() → notation.ts · flag de implementável

### 6. Exemplos de processo e infra, e testes de compatibilidade de hash

- **reembolso.arch.yaml** (`exemplo-processo` · código · novo)
  - Arquivo: `skills/blueroll/examples/reembolso.arch.yaml`
- **infra.arch.yaml** (`exemplo-infra` · código · novo)
  - Arquivo: `skills/blueroll/examples/infra.arch.yaml`
- **test_arch_url.py** (`testes-py` · código · alterado)
  - Arquivo: `tests/test_arch_url.py`
  - Restrição: Hash do pix.arch.yaml igual ao fixture atual (compatibilidade de link)

Relações envolvidas:
- test_arch_url.py → validate() · valida exemplos e compara hash
- reembolso.arch.yaml → notations.json · usa notation processo
- infra.arch.yaml → notations.json · usa infra + types próprios

### 7. SKILL.md ensina a escolher a notação

- **SKILL.md** (`skill-md` · código · alterado)
  - Arquivo: `skills/blueroll/SKILL.md`
  - Restrição: As regras de hoje (status, steps, flows, constraints, escuta) valem para toda notação; só o vocabulário muda
  - Restrição: C4 continua o padrão quando o pedido é arquitetura de software

Relações envolvidas:
- Agente de código → SKILL.md · lê as instruções e escolhe a notação
- README.md / README.pt-BR.md → SKILL.md · aponta para as instruções

### 8. Renomear para Blueroll e atualizar READMEs

- **App.tsx / ui.tsx** (`app-tsx` · código · alterado)
  - Arquivo: `viewer/src/App.tsx`
- **README.md / README.pt-BR.md** (`readme` · código · alterado)
  - Arquivo: `README.md`

Relações envolvidas:
- Agente de código → App.tsx / ui.tsx · abre o link e escuta · https
- Humano → App.tsx / ui.tsx · olha e comenta
- GitHub Pages → App.tsx / ui.tsx · serve o build
- App.tsx / ui.tsx → Canvas.tsx · monta o diagrama
- README.md / README.pt-BR.md → SKILL.md · aponta para as instruções

## Fluxos (como funciona depois do plano)

### Agente desenha um fluxograma de processo

Nada de C4 no meio; o viewer mostra raias, etapas e decisões

1. Humano → Agente de código: "desenha o processo de reembolso"
2. Agente de código → SKILL.md: escolhe notation processo
3. Agente de código → validate(): encode reembolso.arch.yaml
4. validate() → load_notation(): pede os tipos do preset processo
5. load_notation() → notations.json: etapa, decisão, raia e quem pode ficar dentro de quem
6. validate() → arch.v1.json: estrutura ok, decisão dentro de raia ok
7. Agente de código → App.tsx / ui.tsx: abre o link no navegador
8. App.tsx / ui.tsx → Canvas.tsx: monta a visão geral
9. Canvas.tsx → notation.ts: nível mostra "Raias", não "Nível 1 · Contexto"
10. Canvas.tsx → ElementNode.tsx / BoundaryNode.tsx: desenha os cards
11. ElementNode.tsx / BoundaryNode.tsx → notation.ts: card "Decisão" com ícone e cor do preset

### Tipo próprio declarado no YAML

Quando nenhum preset serve, o agente declara os tipos que precisa

1. Agente de código → validate(): YAML com types: [time, squad] sobre infra
2. validate() → load_notation(): mescla types com o preset base
3. Agente de código → App.tsx / ui.tsx: abre o link
4. App.tsx / ui.tsx → Canvas.tsx: monta o diagrama
5. Canvas.tsx → ElementNode.tsx / BoundaryNode.tsx: desenha o card do squad
6. ElementNode.tsx / BoundaryNode.tsx → notation.ts: label, ícone e cor vindos do próprio documento; tipo sem estilo cai no neutro

### Link C4 antigo continua abrindo igual

O caso de falha que mais importa é quebrar os links já compartilhados

1. Humano → App.tsx / ui.tsx: abre um link
2. App.tsx / ui.tsx → Canvas.tsx: documento sem notation
3. Canvas.tsx → notation.ts: assume c4
4. notation.ts → notations.json: preset c4, idêntico ao TYPE_META atual
5. Canvas.tsx → ElementNode.tsx / BoundaryNode.tsx: "Nível 2 · Containers", cards e cores como hoje
