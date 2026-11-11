---
name: blueroll
description: >-
  Diagrama navegável de caixas aninhadas e setas, com fluxos salto a salto. Arquitetura de software em C4 por padrão, e também fluxograma de processo, infraestrutura, domínio ou tipos próprios. Dois usos. (1) Plano de implementação: depois que um plano existir e antes de executar, para o humano ver como o plano afeta o que existe hoje, tirar dúvidas e pedir mudanças antes de aprovar no chat. (2) Documentar o sistema como é hoje, a partir do código, para onboarding ou para entender um repositório. Ative quando o usuário pedir "mostra a arquitetura do plano", "quero validar a estrutura", "gera o C4", "diagrama do plano", "documenta a arquitetura", "explica como o sistema funciona", "mapa do sistema", "onboarding do repo", "desenha o processo", "fluxograma", "mapa da infra", "diagrama de domínio", "show me the plan's architecture", "document this repository's architecture", "draw the process", "muéstrame la arquitectura del plan", "blueroll", ou colar um link do viewer Blueroll ou C4 Plan (contém "#v1.").
---

# Blueroll

O humano entende **estrutura e fronteiras**; a IA executa **depois** do ok no chat. Esta skill não substitui o plano: ela gera a camada visual dele e um brief para a execução. Também documenta o sistema como é hoje (`kind: system`), com o mesmo diagrama e os mesmos fluxos, sem status, passos nem aprovação.

Os caminhos abaixo são relativos à pasta desta skill.

## Regras que valem sempre

- **O chat é a fonte da verdade.** O viewer só mostra: o humano não edita nada lá. Dúvidas e pedidos de mudança chegam como comentários (ou colados no chat), você responde no chat, e toda mudança passa pelo YAML.
- **Só o humano aprova, e só no chat** ("aprovado", "pode seguir", "ok, executa"). Silêncio, fim da escuta ou ausência de comentários não é aprovação.
- **Você escreve só YAML.** Nunca escreva HTML nem monte URL à mão: o script valida, gera o link e gera o brief. Não entregue link de um YAML que não passou no `encode`.
- **O arquivo vale; o link só mostra.** A versão que conta é o `<plano>.arch.yaml`. Um link colado serve para ver, não substitui o arquivo.
- **Idioma:** escreva o conteúdo no idioma da conversa e declare-o em `lang` (`pt-BR`, `en` ou `es`).

```
plano ─► arch.yaml ─► encode ─► link ─► humano olha e comenta ─► você ajusta o YAML ─► ok no chat ─► brief ─► execução
```

## Playbooks

Classifique o pedido e abra o playbook. **Copie os passos numerados dele para a sua lista de tarefas, na ordem e com o texto como está**, antes de qualquer tarefa sua. Um passo que não se aplica continua na lista como `pulado: <motivo>`; nada some em silêncio. Termine com o que a linha **Resposta** do playbook pede.

| Playbook | Quando |
|---|---|
| `playbooks/revisar-plano.md` | Existe um plano de implementação e o humano quer ver a arquitetura antes de aprovar. É o caso padrão. |
| `playbooks/documentar-sistema.md` | Entender ou documentar o que já existe: "documenta a arquitetura", "como esse sistema funciona", onboarding. |
| `playbooks/executar.md` | O humano aprovou no chat e o brief existe. Chamado no fim de `revisar-plano`. |
| `playbooks/escutar.md` | Você tem navegador embutido e acabou de gerar um link. Chamado de dentro de `revisar-plano` e `documentar-sistema`. |
| `playbooks/retomar.md` | O humano colou um link do viewer, quer continuar um diagrama de outra conversa, ou quer um plano sobre um sistema já documentado. |

Processo, infra, domínio ou jornada usam os mesmos playbooks (`revisar-plano` para o que vai mudar, `documentar-sistema` para o que existe); só a `notation` muda.

## Referências

- `references/yaml.md`: regras do `arch.yaml` (escopo, `status`, relações, `steps`, `flows`, `constraints`, idioma, e o que só vale em C4).
- `references/notacoes.md`: como escolher a `notation` e declarar tipos próprios.
- `schema/arch.v1.json`: o schema. Exemplos em `examples/`.

## Script

`python3 scripts/arch_url.py <comando>` (só stdlib + PyYAML; jsonschema opcional).

| Comando | Faz |
|---|---|
| `validate <arquivo>` | Só valida. |
| `encode <arquivo>` | Valida e imprime o link. Erros impedem o link; avisos não. Com `--embed`, o link é para um `<iframe>` (só o diagrama: zoom, mover, abrir caixas); `--zoom 0.8` faz o iframe abrir nesse zoom em vez de encolher o diagrama inteiro até caber (use quando o diagrama for grande e o iframe pequeno). |
| `decode "<link>" [-o arquivo.yaml] [--json]` | Converte um link de volta para YAML (ou JSON). |
| `brief <arquivo> -o <saida>.md` | Plano: o brief de execução. Sistema: a documentação em Markdown. |

O `encode` gera links para a versão publicada do viewer, https://gustavorana25.github.io/c4-model-skill/ (estática; o plano vai no `#hash` e não chega ao servidor). `$BLUEROLL_VIEWER_URL` troca o host.
