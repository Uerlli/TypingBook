# TypingBook

## 1. Project Description
Aplicativo web de prática de digitação a partir de documentos reais do usuário.
O usuário importa um arquivo (PDF, EPUB ou TXT), o app extrai o texto, identifica
automaticamente o que é prosa praticável e o que é estrutura/metadado do documento,
e monta sessões de digitação a partir do conteúdo aprovado. Todo o processamento é
local (navegador): nenhum documento é enviado para servidores.

## 2. Page Structure
- `/` — Minha estante (dashboard, importação e lista de livros)
- `/practice` — Praticar (sessão de digitação do último livro)
- `/practice/:bookId` — Praticar um livro específico
- `*` — 404

## 3. Core Features
- [x] Importação de documentos PDF / EPUB / TXT (drag & drop + seletor)
- [x] Extração de texto com progresso real por página (PDF) / por seção (EPUB)
- [x] Remoção de cabeçalhos, rodapés e números de página repetidos (PDF via posição/fonte)
- [x] Classificação automática de blocos: narrativo ("Texto") x estrutural ("Estrutural")
- [x] Tela de revisão de blocos com toggles manuais e contagem de palavras em tempo real
- [x] Armazenamento em duas camadas: metadados leves em localStorage, texto completo em IndexedDB
- [x] Tratamento de QuotaExceededError com aviso amigável (toast)
- [x] Sessões de digitação com métricas (WPM, precisão, tempo, erros)
- [x] Teclado virtual com destaque da próxima tecla e modal de resultados
- [x] Estante com progresso por livro, retomada e remoção

## 4. Data Model Design
Não há banco remoto. Persistência local:

### localStorage — `typingbook.books.v1`
Metadados leves de cada livro: id, title, author, format, wordCount, progress,
currentSession, totalSessions, avgWpm, completedSessions, coverColor, lastRead, createdAt.

### IndexedDB — `typingbook-content` / store `bookContent`
Texto pesado por livro: `{ id, content (bruto), filteredContent (aprovado), updatedAt }`.

## 5. Backend / Third-party Integration Plan
- Database: não aplicável — app local, sem login nem dados no servidor
- Shopify / Stripe / Supabase: não utilizados

## 6. Development Phase Plan

### Phase 1: Base + Estante (concluído)
- Goal: shell visual (tema escuro, Fraunces/DM Sans) e dashboard com estante
- Deliverable: cabeçalho, dashboard, cards de estatística, lista de livros

### Phase 2: Armazenamento em duas camadas (concluído — Parte 1)
- Goal: evitar crash por QuotaExceededError com documentos grandes
- Deliverable: `bookStorage.ts` (IndexedDB), `localStore.ts` seguro, toast de quota,
  progresso real por página na extração de PDF

### Phase 3: Detecção de conteúdo praticável (concluído — Parte 2)
- Goal: separar prosa narrativa de estrutura do documento, de forma genérica
- Deliverable: `contentClassifier.ts` com heurísticas componíveis, remoção de linhas
  repetidas (cabeçalho/rodapé), sinais de PDF (fonte/posição) e EPUB (listas/tabelas/headings),
  tela de revisão de blocos com toggles e contagem de palavras

### Phase 4: Prática e resultados (concluído)
- Goal: fluxo de digitação com métricas
- Deliverable: TypingArea, StatsBar, VirtualKeyboard, ResultsModal, registro de sessão

### Phase 5: Próximos passos (a definir)
- Goal: refinamentos de sessão (ex.: modo de metas, exportação de estatísticas)
- Deliverable: a confirmar com o usuário