# NEXO EDITOR

Editor de vídeos profissional que roda inteiramente no navegador, com interface em
português brasileiro, tema escuro grafite com detalhes em roxo e azul, e processamento
de mídia real — sem protótipos ou ferramentas decorativas.

Inspirado em CapCut Desktop, Adobe Premiere Pro e DaVinci Resolve, com identidade
visual própria.

## Recursos

- **Interface principal** — menu lateral, página inicial, projetos recentes, biblioteca
  de mídias, configurações e temas claro/escuro.
- **Editor** — linha do tempo com múltiplas faixas de vídeo e áudio, pré-visualização
  em canvas, controles de reprodução, cortar/dividir/juntar clipes, arrastar e soltar,
  aparar, mover, zoom, desfazer/refazer e atalhos de teclado.
- **Ferramentas de vídeo** — recorte, escala, rotação, espelhamento, velocidade,
  câmera lenta, congelar quadro, opacidade, keyframes, brilho, contraste, saturação,
  temperatura, filtros e correção de cores.
- **Texto** — títulos animados, legendas, fontes, cores, contorno, sombras, animações
  de entrada/saída e controle de posição e tamanho.
- **Áudio** — importação de músicas e efeitos, volume, fade in/out, redução de ruído,
  separar áudio do vídeo, volume por faixa e visualização de forma de onda.
- **Efeitos e transições** — biblioteca de filtros, efeitos e transições aplicáveis
  (fade, dissolver, cortina, deslizar, zoom, glitch).
- **Exportação real** — MP4 e WebM, resoluções 720p/1080p/1440p/4K, FPS 24/30/60,
  controle de qualidade, barra de progresso, cancelamento e escolha de destino.
- **Projetos** — criar, salvar, abrir, renomear e excluir, com salvamento automático
  e persistência local via IndexedDB.

## Stack

- React 18 + TypeScript + Vite
- Zustand para estado e histórico (undo/redo)
- Canvas 2D para composição de vídeo
- Web Audio API para mixagem e formas de onda
- MediaRecorder + captureStream para exportação
- IndexedDB (idb) para persistência de projetos e mídias

## Como executar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/`.

### Build de produção

```bash
npm run build
npm run preview
```

## Atalhos

| Tecla | Ação |
| --- | --- |
| Espaço | Reproduzir / pausar |
| S | Dividir clipe no cursor |
| Delete | Excluir clipe selecionado |
| Ctrl + D | Duplicar clipe |
| Ctrl + Z / Ctrl + Y | Desfazer / refazer |
| Ctrl + S | Salvar projeto |
| ← / → | Avançar / retroceder um quadro |
| Home / End | Início / fim |

## Estrutura

```
src/
  components/   Interface (home, editor, timeline, inspector, exportação)
  engine/       Motor de renderização em canvas e exportação
  db/           Persistência IndexedDB
  lib/          Utilitários, importação de mídia, presets
  store.ts      Estado central e ações
  types.ts      Tipos do domínio
```