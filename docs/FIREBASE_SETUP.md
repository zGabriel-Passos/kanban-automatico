# 🔥 Firebase Setup — KanBan AI

Este projeto usa o **Firebase Admin SDK** (backend) para persistir as tarefas no Firestore.
Siga os passos abaixo para configurar o seu próprio projeto Firebase.

---

## 1. Criar um projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome ao projeto e conclua a criação

---

## 2. Ativar o Firestore

1. No menu lateral, clique em **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** (pode ajustar as regras depois)
4. Selecione a região e confirme

---

## 3. Gerar a chave do Service Account (Admin SDK)

1. No Firebase Console, vá em **Configurações do projeto** (ícone de engrenagem)
2. Clique na aba **"Contas de serviço"**
3. Clique em **"Gerar nova chave privada"**
4. Confirme clicando em **"Gerar chave"**
5. Um arquivo `.json` será baixado — guarde-o com segurança

O arquivo terá este formato:
```json
{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com",
  "client_id": "123456789",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 4. Configurar o arquivo .env

Copie os valores do JSON para o seu `.env`:

```env
FIREBASE_PROJECT_ID=        → project_id
FIREBASE_PRIVATE_KEY_ID=    → private_key_id
FIREBASE_PRIVATE_KEY=       → private_key  (mantenha as aspas!)
FIREBASE_CLIENT_EMAIL=      → client_email
FIREBASE_CLIENT_ID=         → client_id
FIREBASE_CERT_URL=          → client_x509_cert_url
```

> ⚠️ A `FIREBASE_PRIVATE_KEY` deve ficar entre aspas duplas e manter os `\n` literais:
> ```env
> FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
> ```

---

## 5. Verificar a conexão

Execute o projeto:
```bash
python main.py
```

Se tudo estiver correto, você verá no terminal:
```
✅ Firebase connected successfully!
📦 Project: seu-projeto
```

---

## ⚠️ Segurança

- **Nunca** suba o arquivo `.json` ou o `.env` para o GitHub
- O `.gitignore` já está configurado para proteger esses arquivos
- **Nunca** compartilhe sua `FIREBASE_PRIVATE_KEY` com ninguém

---

## 🆘 Problemas comuns

| Erro | Solução |
|---|---|
| `Firebase credentials not configured` | Verifique se o `.env` existe e está preenchido |
| `invalid_grant` | A chave pode ter sido revogada — gere uma nova |
| `PRIVATE_KEY` com erro de formato | Certifique-se de que está entre aspas duplas no `.env` |
