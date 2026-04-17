# 🤖 KanBan AI — Gerador Automático de Arquivos com IA

> Projeto pessoal que combina gerenciamento de tarefas no estilo Kanban com geração automática de arquivos via Inteligência Artificial (Groq API), persistência em nuvem (Firebase Firestore) e automação de desktop (PyAutoGUI).

> **Stack resumida:** `Python` · `Flask` · `Firebase Firestore` · `Groq (LLaMA 3.3)` · `Vanilla JS` · `PyAutoGUI`

![KanBan AI Preview](assets/preview.png)

---

## 📌 Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Fluxo de Dados](#fluxo-de-dados)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Pipeline de IA](#pipeline-de-ia)
- [API REST](#api-rest)
- [Como Executar](#como-executar)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Segurança](#segurança)
- [Possíveis Evoluções](#possíveis-evoluções)

---

## Visão Geral

O **KanBan AI** é uma aplicação web local que automatiza a criação de arquivos de código ou documentação a partir de instruções em linguagem natural. O usuário descreve o que quer criar, e a IA planeja, gera e abre o arquivo automaticamente — tudo orquestrado por um board Kanban visual.

### Problema que resolve
Desenvolvedores frequentemente precisam criar arquivos repetitivos (páginas HTML, scripts JS, documentações Markdown). Este projeto automatiza esse processo usando IA generativa, reduzindo o tempo de scaffolding de projetos.

> ⚠️ **Nota sobre a Groq API:** O modelo LLaMA 3.3 70B é excelente para planejamento e geração de texto, mas pode não produzir código perfeito em todos os casos. Para resultados melhores na geração de código, considere trocar para Claude (Anthropic) ou GPT-4 — a troca é simples, veja a seção [Possíveis Evoluções](#possíveis-evoluções).

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   HTML5 + CSS3 + Vanilla JavaScript (Fetch API)             │
│   Drag & Drop nativo · Modal de edição · Toast notifications│
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP REST (JSON)
┌────────────────────▼────────────────────────────────────────┐
│                     BACKEND (Flask)                         │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  CRUD API   │  │   AI Routes  │  │  File System API  │   │
│  │ /api/tasks  │  │ /api/ai/plan │  │  os.makedirs()    │   │
│  │  GET·POST   │  │ /api/ai/build│  │  open() · write() │   │
│  │  PUT·DELETE │  │ /api/ai/review│ │                   │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬─────────┘   │
│         │                │                     │            │
└─────────┼────────────────┼─────────────────────┼────────────┘
          │                │                     │
┌─────────▼──────┐ ┌───────▼────────┐ ┌──────────▼──────────┐
│    Firebase    │ │   Groq API     │ │     Sistema Local   │
│   Firestore    │ │ LLaMA 3.3 70B  │ │  Pasta de destino   │
│  (ai_tasks)    │ │(IA Generativa) │ │  PyAutoGUI · Edge   │
└────────────────┘ └────────────────┘ └─────────────────────┘
```

---

## Fluxo de Dados

```
Usuário cria tarefa
        │
        ▼
┌──────────────┐
│     IDLE     │  ← Usuário preenche: título, pasta, tipo de arquivo, prompt
│              │     Salvo no Firestore (coleção: ai_tasks)
└──────┬───────┘
       │  drag manual
       ▼
┌──────────────┐
│     PLAN     │  ← Flask chama Groq API com o prompt
│              │     IA retorna plano estruturado
│              │     Usuário pode editar o plano no modal
└──────┬───────┘
       │  automático (após confirmar)
       ▼
┌──────────────┐
│    BUILD     │  ← Flask chama Groq API com plano + prompt
│              │     IA gera conteúdo do arquivo
│              │     Flask salva arquivo na pasta local escolhida
└──────┬───────┘
       │  automático
       ▼
┌──────────────┐
│    REVIEW    │  ← Flask abre o arquivo no navegador (Edge)
│              │     via subprocess ou PyAutoGUI (fallback)
└──────────────┘
```

---

## Tecnologias Utilizadas

### Backend
| Tecnologia | Versão | Função |
|---|---|---|
| Python | 3.x | Linguagem principal |
| Flask | 3.0.0 | Framework web / API REST |
| Flask-CORS | 4.0.0 | Cross-Origin Resource Sharing |
| firebase-admin | 6.3.0 | SDK Firebase (Firestore) |
| groq | 1.x | SDK da API de IA (Groq) |
| pyautogui | 0.9.54 | Automação de desktop |
| python-dotenv | 1.0.0 | Variáveis de ambiente |

### Frontend
| Tecnologia | Função |
|---|---|
| HTML5 | Estrutura semântica + Drag & Drop nativo |
| CSS3 | Design system com variáveis, Grid, Flexbox |
| JavaScript (ES6+) | Lógica assíncrona (async/await), Fetch API |
| Google Fonts | Space Mono (display) + IBM Plex Sans (body) |

### Serviços Externos
| Serviço | Função |
|---|---|
| Firebase Firestore | Banco de dados NoSQL em nuvem |
| Groq API (LLaMA 3.3 70B) | Modelo de linguagem para geração de conteúdo |

---

## Estrutura de Arquivos

```
kanban-automatico/
│
├── main.py                  # Backend Flask — rotas, Firebase, Groq, PyAutoGUI
├── requirements.txt         # Dependências Python
├── .env                     # Credenciais (não versionado)
├── .gitignore               # Proteção de secrets
├── vercel.json              # Configuração de deploy (referência)
│
├── templates/
│   ├── index.html           # Aplicação Kanban principal
│   └── landing.html         # Landing page de apresentação
│
├── static/
│   ├── script.js            # Lógica frontend — pipeline de IA, drag & drop
│   ├── style.css            # Design system — dark/light theme
│   ├── landing.js           # Scripts da landing page
│   └── landing.css          # Estilos da landing page
│
├── docs/
│   ├── FIREBASE_SETUP.md    # Instruções de configuração do Firebase
│   ├── KANBAN_WORKFLOW.md   # Documentação do workflow original
│   └── LOGS.md              # Histórico de mudanças
│
└── README.md                # Este arquivo
```

---

## Pipeline de IA

O sistema utiliza dois estágios de chamada à Groq API:

### Estágio 1 — PLAN (`POST /api/ai/plan`)
```
Input:  título da tarefa + tipo de arquivo + prompt do usuário
Modelo: llama-3.3-70b-versatile
Output: plano estruturado descrevendo o que será criado
```
O plano é exibido num modal editável — o usuário pode revisar e ajustar antes de prosseguir.

### Estágio 2 — BUILD (`POST /api/ai/build`)
```
Input:  prompt original + plano (possivelmente editado) + título
Modelo: llama-3.3-70b-versatile
Output: conteúdo bruto do arquivo (.md, .html ou .js)
```
O Flask salva o arquivo na pasta local escolhida pelo usuário. O nome do arquivo é derivado do título da tarefa (sanitizado).

### Estágio 3 — REVIEW (`POST /api/ai/review`)
```
Input:  caminho do arquivo gerado + tipo
Ação:   abre o arquivo no Microsoft Edge via subprocess
        fallback: PyAutoGUI simula Win+R → msedge → Enter
```

---

## API REST

Base URL: `http://localhost:5000`

### Tarefas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/tasks` | Lista todas as tarefas |
| POST | `/api/tasks` | Cria nova tarefa |
| PUT | `/api/tasks/<id>` | Atualiza tarefa (coluna, título, etc.) |
| DELETE | `/api/tasks/<id>` | Remove tarefa |

### IA

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/ai/plan` | Gera plano via Groq e avança para BUILD |
| POST | `/api/ai/build` | Gera arquivo e avança para REVIEW |
| POST | `/api/ai/review` | Abre arquivo no navegador |

### Modelo de dados (Firestore — coleção `ai_tasks`)

```json
{
  "id": "firestore_doc_id",
  "title": "Nome da tarefa",
  "folder": "output",
  "fileType": "html",
  "prompt": "Crie uma página de login moderna...",
  "plan": "Plano gerado pela IA...",
  "generatedFile": "C:/caminho/absoluto/arquivo.html",
  "column": "idle | plan | build | review",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "order": 0
}
```

---

## Como Executar

### Pré-requisitos
- Python 3.8+
- Conta no Firebase (Firestore habilitado)
- Chave de API da Groq ([console.groq.com](https://console.groq.com))

### 1. Clonar o repositório
```bash
git clone https://github.com/zGabriel-Passos/kanban-automatico.git
cd kanban-automatico
```

### 2. Instalar dependências
```bash
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

Renomeie o arquivo `.env.example` para `.env`:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Abra o `.env` e preencha suas credenciais:
- **Groq:** obtenha sua chave em [console.groq.com](https://console.groq.com)
- **Firebase:** siga o passo a passo em [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)

> ⚠️ O projeto lê o arquivo `.env` — o `.env.example` é apenas o template. Sem o `.env` preenchido o servidor não vai iniciar.

### 4. Executar
```bash
python main.py
```

### 5. Acessar
- **App:** http://localhost:5000/app
- **Landing:** http://localhost:5000

### Acesso na rede local
Como o servidor roda em `host='0.0.0.0'`, qualquer dispositivo na mesma rede Wi-Fi pode acessar via:
```
http://<SEU_IP_LOCAL>:5000/app
```
Para descobrir seu IP: `ipconfig` (Windows) → IPv4 Address.

---

## Variáveis de Ambiente

```env
# Groq AI
GROQ_API_KEY=sua_chave_aqui

# Firebase (Service Account)
FIREBASE_PROJECT_ID=seu_projeto
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_CERT_URL=...

# Flask
FLASK_SECRET_KEY=sua_chave_secreta
FLASK_ENV=development
```

> ⚠️ **Nunca versione o arquivo `.env`** — ele já está no `.gitignore`.

---

## Segurança

| Medida | Implementação |
|---|---|
| Credenciais protegidas | Variáveis de ambiente via `python-dotenv` |
| `.gitignore` | Protege `.env` de ser versionado |
| Validação de input | Backend valida título (1-200 chars) e colunas permitidas |
| XSS Protection | `escapeHtml()` no frontend antes de inserir no DOM |
| CORS restrito | Apenas `localhost:5000` por padrão |
| Firebase Admin SDK | Autenticação server-side (não expõe credenciais ao cliente) |

---

## Possíveis Evoluções

| Feature | Descrição |
|---|---|
| 🔐 Autenticação | Firebase Auth — login por usuário |
| 🤖 Troca de modelo | Suporte a Claude (Anthropic) ou GPT-4 como alternativa ao Groq |
| 📂 Browser de pastas | Interface visual para escolher a pasta de destino |
| ♻️ Regenerar arquivo | Botão para pedir à IA uma nova versão sem recriar a tarefa |
| 📝 Histórico de versões | Salvar versões anteriores dos arquivos gerados |
| 🌐 Multi-usuário | Boards separados por usuário com Firebase Auth |
| 📊 Dashboard | Métricas de produtividade — tarefas criadas, tempo médio por fase |

---

## Autor

Desenvolvido por interesse pessoal utilizando Flask, Firebase, Groq API e automação de desktop com PyAutoGUI.

**Stack resumida:** `Python` · `Flask` · `Firebase Firestore` · `Groq (LLaMA 3.3)` · `Vanilla JS` · `PyAutoGUI`

**Repositório:** [github.com/zGabriel-Passos/kanban-automatico](https://github.com/zGabriel-Passos/kanban-automatico)
