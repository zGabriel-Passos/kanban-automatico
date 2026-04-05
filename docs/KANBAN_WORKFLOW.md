# 📋 KanBan AI — Workflow e Documentação Técnica

---

## Fluxo do Pipeline de IA

O projeto funciona em 4 colunas. Apenas a transição **IDLE → PLAN** é manual — todo o resto é automático.

```
┌──────────┐   drag manual   ┌──────────┐   automático   ┌──────────┐   automático   ┌──────────┐
│   IDLE   │ ──────────────▶ │   PLAN   │ ─────────────▶ │  BUILD   │ ─────────────▶ │  REVIEW  │
└──────────┘                 └──────────┘                 └──────────┘                └──────────┘
  Usuário                    Groq planeja                 Groq gera                   Arquivo
  preenche                   o que será                   o arquivo                   aberto no
  a tarefa                   criado                       localmente                  navegador
```

### IDLE
O usuário cria a tarefa preenchendo:
- **Nome** da tarefa
- **Pasta de destino** (relativa ao diretório do projeto)
- **Tipo de arquivo** — `.md`, `.html` ou `.js`
- **Prompt** — instruções em linguagem natural para a IA

### PLAN
Ao arrastar para PLAN, o Flask chama a Groq API com o prompt do usuário. A IA retorna um plano estruturado descrevendo o que será criado. O plano aparece num **modal editável** — o usuário pode revisar e ajustar antes de confirmar.

### BUILD
Após confirmar o plano, o Flask chama a Groq API novamente com o plano + prompt original. A IA gera o conteúdo bruto do arquivo. O Flask salva o arquivo fisicamente na pasta escolhida. O nome do arquivo é derivado do título da tarefa (sanitizado).

### REVIEW
O arquivo gerado é aberto automaticamente no Microsoft Edge via `subprocess`. Se falhar, o PyAutoGUI executa o fallback abrindo o Edge manualmente.

---

## Estrutura de Dados

Coleção no Firestore: `ai_tasks`

```json
{
  "id": "firestore_doc_id",
  "title": "Nome da tarefa",
  "folder": "output",
  "fileType": "html",
  "prompt": "Instruções do usuário...",
  "plan": "Plano gerado pela IA...",
  "generatedFile": "C:/caminho/absoluto/arquivo.html",
  "column": "idle | plan | build | review",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "order": 0
}
```

---

## API REST

Base URL: `http://localhost:5000`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/tasks` | Lista todas as tarefas |
| POST | `/api/tasks` | Cria nova tarefa |
| PUT | `/api/tasks/<id>` | Atualiza tarefa |
| DELETE | `/api/tasks/<id>` | Remove tarefa |
| POST | `/api/ai/plan` | Gera plano via Groq |
| POST | `/api/ai/build` | Gera arquivo via Groq e salva localmente |
| POST | `/api/ai/review` | Abre arquivo no navegador |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python · Flask · Flask-CORS |
| Banco de dados | Firebase Firestore (coleção `ai_tasks`) |
| IA | Groq API — modelo `llama-3.3-70b-versatile` |
| Automação | PyAutoGUI · subprocess |
| Frontend | HTML5 · CSS3 · Vanilla JS (Fetch API) |
| Fontes | Space Mono · IBM Plex Sans |

---

## Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Alt + Q` | Abre o modal de nova tarefa |
| `ESC` | Fecha qualquer modal aberto |

---

## Segurança

| Medida | Implementação |
|---|---|
| Credenciais protegidas | Variáveis de ambiente via `python-dotenv` |
| `.gitignore` | Protege `.env` de ser versionado |
| Validação de input | Backend valida título (1-200 chars) e colunas permitidas |
| XSS Protection | `escapeHtml()` no frontend antes de inserir no DOM |
| CORS restrito | Apenas `localhost:5000` por padrão |
| Firebase Admin SDK | Autenticação server-side |

---

## Troubleshooting

| Problema | Solução |
|---|---|
| Firebase não conecta | Verificar credenciais no `.env` — ver `docs/FIREBASE_SETUP.md` |
| Groq não responde | Verificar `GROQ_API_KEY` no `.env` |
| Arquivo não é criado | Verificar se a pasta de destino existe ou se o Flask tem permissão de escrita |
| Edge não abre | Verificar se o Microsoft Edge está instalado — o fallback PyAutoGUI será acionado |
| Tasks não carregam | Verificar console do Flask e do navegador para erros de API |

---

## Possíveis Evoluções

| Feature | Descrição |
|---|---|
| 🔐 Autenticação | Firebase Auth — boards separados por usuário |
| 🤖 Troca de modelo | Suporte a Claude (Anthropic) como alternativa ao Groq |
| 📂 Browser de pastas | Interface visual para escolher a pasta de destino |
| ♻️ Regenerar arquivo | Pedir à IA uma nova versão sem recriar a tarefa |
| 📝 Histórico de versões | Salvar versões anteriores dos arquivos gerados |
| 📊 Dashboard | Métricas — tarefas criadas, tempo médio por fase |
