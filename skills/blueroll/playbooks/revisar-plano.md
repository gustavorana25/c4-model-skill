# Revisar um plano

**Você desenha; o humano decide.** Nada do plano é executado antes do ok no chat.

Quando: existe um plano de implementação (ou ele acabou de ser escrito) e o humano quer ver a arquitetura antes de aprovar.

1. Leia o plano inteiro. Se já existe um `arch.yaml` deste sistema ou de uma versão anterior do plano, siga `playbooks/retomar.md` e parta dele.
2. Escolha a `notation` (`references/notacoes.md`). Para software, é `c4` e pode omitir.
3. Escreva `<nome-do-plano>.arch.yaml` ao lado do plano, seguindo `references/yaml.md`. Um `step` por passo do plano, de 1 a 3 `flows`, `constraints` onde há decisão que importa.
4. Rode `python3 scripts/arch_url.py encode <plano>.arch.yaml`. Erros: corrija e rode de novo; não entregue link sem passar. Avisos: corrija se fizer sentido (ex.: algo novo que não abre até o código).
5. Entregue o link. Com navegador embutido, abra o link lá e siga `playbooks/escutar.md`. Sem navegador, mande o link no chat.
6. Para cada pedido de mudança, no chat ou num comentário: altere o YAML, rode `encode` de novo, entregue o link novo (ou `load()` se estiver escutando) e diga no chat o que mudou.
7. Espere a aprovação **no chat** ("aprovado", "pode seguir", "ok, executa"). Silêncio, fim da escuta ou ausência de comentários não é aprovação.
8. Quando aprovar: se estiver escutando, chame `blueroll.stop()`. Marque `approved: true` no YAML e gere o brief: `python3 scripts/arch_url.py brief <plano>.arch.yaml -o <plano>.arch.md`.
9. Resuma em poucas linhas o que mudou desde o primeiro link por causa da conversa (restrições, estrutura, fluxos). Adicione ao plano uma referência ao `<plano>.arch.md`.
10. Siga `playbooks/executar.md`.

**Resposta (passo 5):** o link em uma linha, um resumo curto do que o plano muda ("3 elementos novos, 2 alterados"), que dá para apertar **C** (ou **Comentar**), clicar nos cards e perguntar ou pedir mudança, e que a aprovação é aqui no chat.
