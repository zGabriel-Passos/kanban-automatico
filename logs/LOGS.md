# 📋 Changelog — KanBan AI

---

## v2.0.0 — Pipeline de IA com Groq

- Integração com **Groq API** (modelo `llama-3.3-70b-versatile`)
- Novo pipeline automático: **IDLE → PLAN → BUILD → REVIEW**
- Endpoint `POST /api/ai/plan` — IA planeja o arquivo a partir do prompt
- Endpoint `POST /api/ai/build` — IA gera e salva o arquivo localmente
- Endpoint `POST /api/ai/review` — abre o arquivo no Edge via `subprocess` + fallback PyAutoGUI
- Modal editável para revisar o plano da IA antes de confirmar o build
- Modal de detalhes da task — exibe nome, status, pasta, arquivo gerado, prompt e plano
- Nova coleção no Firestore: `ai_tasks` (separada do projeto original)
- Campos adicionados à task: `folder`, `fileType`, `prompt`, `plan`, `generatedFile`
- Coluna "Creating" renomeada para **IDLE**; coluna "Organize" removida
- Status do header: mostra **"1 task running"** (🟡) enquanto a IA trabalha
- Atalho `Alt+Q` para abrir o modal de nova tarefa
- Atalho `ESC` para fechar qualquer modal
- Fix: `dragstart` agora captura a coluna original antes do card se mover visualmente, corrigindo o bug de atualização no Firebase

---

## v1.0.0 — Kanban Base

- Backend Flask com API REST completa (GET, POST, PUT, DELETE)
- Persistência no Firebase Firestore (coleção `tasks`)
- 5 colunas: Creating, Plan, Organize, Build, Review
- Drag & Drop nativo entre colunas
- Modal para criar tarefas (título + descrição)
- Tema claro/escuro com persistência no `localStorage`
- Contador de tarefas em tempo real no header
- Notificações toast (success, error, info)
- XSS protection via `escapeHtml()`
- CORS restrito ao `localhost:5000`
- Validação de input no backend (título 1-200 chars, colunas válidas)
- Error handlers (404, 500)
- Landing page com Hero, Features, Pricing, FAQ e Footer
- Design system: Space Mono + IBM Plex Sans · Dark blue + Cyan + Pink
- Responsivo mobile-first
