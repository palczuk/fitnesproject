# Plano 105→98 — Treino & Alimentação

Site estático (sem build, sem dependências) com o calendário de treino e alimentação
de 9/ago a 31/dez/2026, com filtros por mês, tipo de treino e busca livre.

## Arquivos

- `index.html` — estrutura da página
- `style.css` — visual (tema escuro, grade estilo GitHub)
- `script.js` — filtros, calendário em grade e painel de detalhes do dia
- `data.json` — todos os dias com treino, foco alimentar, o que comer/evitar

## Como publicar no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser privado ou público).
2. Suba estes 4 arquivos (`index.html`, `style.css`, `script.js`, `data.json`) na raiz do repositório.
3. No repositório: **Settings → Pages → Source** → selecione a branch `main` e a pasta `/ (root)`.
4. Salve. Em ~1 minuto o GitHub mostra o link, algo como:
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

## Testar localmente antes de publicar

Abrir `index.html` direto no navegador (duplo clique) **não funciona** — o navegador
bloqueia o `fetch('data.json')` em arquivos locais por segurança (CORS).

Rode um servidor local simples na pasta do site:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador.

## Editar os dados

Basta editar `data.json` — cada dia é um objeto com `date`, `treino`, `tipo`, `foco`,
`comer`, `evitar`, `preManha`, `preTarde`. O `tipo` controla a cor no calendário
(veja o objeto `COLORS` no topo de `script.js` para trocar as cores).

Para mudar a meta de peso ou as datas do plano, edite o bloco `meta` no topo do `data.json`.
