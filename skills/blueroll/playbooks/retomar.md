# Retomar de um link ou de um YAML existente

**O arquivo vale; o link só mostra.** A versão que conta é sempre o `arch.yaml` da conversa ou do repositório.

Quando: o humano colou um link do viewer Blueroll ou C4 Plan (contém `#v1.`), pediu para continuar um diagrama de outra conversa, ou quer um plano sobre um sistema já documentado.

1. Procure o `arch.yaml` correspondente na conversa e no repositório (`*.arch.yaml`, perto do plano ou em `docs/`).
2. Se o humano colou um link e o YAML existe, o link só serve para ver: rode `python3 scripts/arch_url.py decode "<link>" --json` e compare com o arquivo. Se forem diferentes, diga no chat o que difere e siga com o arquivo. O sufixo `~<id>` do link é só o nível aberto, não muda o conteúdo.
3. Se o humano colou um link e não há YAML, recupere o arquivo: `python3 scripts/arch_url.py decode "<link>" -o <nome>.arch.yaml`. A partir daí ele é a versão que vale.
4. Para um plano sobre um sistema documentado (`kind: system`), copie o YAML para `<nome-do-plano>.arch.yaml`, troque `kind` para `plan` e marque com `status` o que o plano cria, altera ou remove.
5. Siga o playbook do `kind` do arquivo: `plan` → `playbooks/revisar-plano.md` (a partir do passo 2); `system` → `playbooks/documentar-sistema.md` (a partir do passo 7).

**Resposta:** de onde veio o YAML (arquivo existente, recuperado do link ou copiado do sistema) e, se o link e o arquivo diferiam, o que mudava.
