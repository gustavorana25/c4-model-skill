# Documentar o sistema como é hoje

**Você descreve o que o código mostra, não o que imagina.** Sem plano, sem status, sem aprovação.

Quando: o pedido é entender ou documentar o que já existe ("documenta a arquitetura", "como esse sistema funciona", onboarding de um repositório).

1. **Leia antes de escrever.** Pontos de entrada (rotas, handlers, consumers, jobs), manifests (`package.json`, `docker-compose`, infra), migrações e clientes de serviços externos dizem quais são os containers, bancos, filas e externos. Não invente peças que o código não mostra; se algo for incerto, diga no chat.
2. Escolha a `notation` (`references/notacoes.md`). Para software, é `c4`.
3. Escreva o YAML com `kind: system` (exemplo completo: `examples/loja.arch.yaml`), sem `status`, `steps` e `approved` (o `validate` avisa se sobrar algum):
   ```yaml
   version: 1
   kind: system
   title: Loja Online
   description: Uma ou duas frases sobre o que o sistema faz.
   ```
4. **Fluxos são o principal.** De 2 a 4: o caminho que mais importa para o negócio, a principal tarefa em segundo plano e o caso de falha mais comum. É por eles que quem chega entende o sistema. Relações e fluxos seguem `references/yaml.md`.
5. **Profundidade:** desça até `code` só no que os fluxos atravessam, com `path` real (confira que o arquivo existe). O resto fica em `container` ou `component`, fechado.
6. `constraints` viram as **regras da casa** que quem mexe precisa saber (idempotência, quem pode escrever em qual tabela, contrato que não muda).
7. Rode `python3 scripts/arch_url.py encode <arquivo>.arch.yaml` e corrija até passar sem erros.
8. Entregue o link. Com navegador embutido, siga `playbooks/escutar.md`: os comentários são perguntas, que você responde no chat, ou correções da documentação, que você aplica no YAML e recarrega com `load()`.
9. Se o humano quiser um texto versionável no repositório, gere a documentação em Markdown (elementos, relações e fluxos): `python3 scripts/arch_url.py brief docs/arquitetura.arch.yaml -o docs/arquitetura.md`.

**Resposta (passo 8):** o link, o que o sistema tem em uma linha ("5 containers, 2 externos, 2 fluxos"), e que dá para seguir os fluxos na aba Fluxos e perguntar com **C**. Diga também o que ficou incerto na leitura do código.
