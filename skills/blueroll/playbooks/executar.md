# Executar um plano aprovado

**O brief é o contrato.** Você implementa dentro da estrutura e das restrições aprovadas; para sair delas, pergunte.

Quando: o humano aprovou o diagrama no chat e o `<plano>.arch.md` foi gerado.

1. Confira que o `<plano>.arch.yaml` tem `approved: true` e que o `<plano>.arch.md` foi gerado a partir dele. Se faltar algum, volte a `playbooks/revisar-plano.md` (passo 8).
2. Siga os passos do brief na ordem, com a estrutura (elementos, relações, fluxos) e todas as restrições.
3. Se a implementação exigir mudar a estrutura ou quebrar uma restrição, **pare e pergunte** no chat. Contratos referenciados (`contract`) não mudam sem perguntar.
4. Fora das restrições, prefira o mais simples e siga o padrão do código existente. O que o humano pediu no chat tem prioridade sobre sua proposta original.
5. Ao final, compare o que foi implementado com o YAML: cada `code` com `path` existe e foi tocado, e nada foi criado fora dele.

**Resposta:** o que foi implementado, passo a passo do brief, e as divergências do YAML (componente novo não previsto, dependência fora das relações, contrato alterado). Sem divergências, diga isso.
