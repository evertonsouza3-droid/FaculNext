# 🚀 Guia de Deploy - FaculNext

## 📋 Pré-requisitos
- Conta no GitHub
- Conta em uma plataforma de deploy (Railway, Render, Vercel, ou Heroku)

## 🎯 Opções de Deploy

### Opção 1: Railway (Recomendado - Mais Fácil)

#### Passo 1: Preparar Repositório GitHub
```bash
# Criar repositório no GitHub
# Fazer upload dos arquivos do projeto
```

#### Passo 2: Deploy no Railway
1. Acesse: https://railway.app
2. Clique em "Start a New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte sua conta GitHub
5. Selecione o repositório `FaculNext`
6. Railway detectará automaticamente o `package.json` e `Procfile`
7. Deploy será iniciado automaticamente

#### Passo 3: Configurar Banco de Dados
1. No painel Railway, vá para "Variables"
2. Adicione: `NODE_ENV=production`
3. O SQLite será criado automaticamente

### Opção 2: Render (Grátis com PostgreSQL)

#### Passo 1: Preparar para PostgreSQL
```javascript
// No server.js, adicionar no topo:
const sqlite3 = process.env.DATABASE_URL ? require('sqlite3').verbose() : require('sqlite3').verbose();
// Para produção, considere migrar para PostgreSQL
```

#### Passo 2: Deploy no Render
1. Acesse: https://render.com
2. Clique em "New" > "Web Service"
3. Conecte GitHub e selecione o repo
4. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Adicione variável: `NODE_ENV=production`

### Opção 3: Vercel (Rápido para Node.js)

#### Passo 1: Instalar Vercel CLI (se possível)
```bash
npm install -g vercel
```

#### Passo 2: Deploy
```bash
vercel --prod
# Ou via dashboard: vercel.com
```

#### Passo 3: Configurar
- **Framework Preset**: Other
- **Root Directory**: ./
- **Build Command**: npm install
- **Output Directory**: ./
- **Install Command**: npm install

### Opção 4: Heroku via GitHub

#### Passo 1: Criar app no Heroku
1. Acesse: https://heroku.com
2. "New" > "Create new app"
3. Nome: `faculnext-app`
4. Conecte GitHub repo

#### Passo 2: Configurar Deploy
1. Vá para "Deploy" tab
2. Selecione "GitHub" como método
3. Conecte repo e habilite auto-deploy
4. Clique "Deploy Branch"

## 🔧 Configurações Adicionais

### Variáveis de Ambiente
```bash
NODE_ENV=production
PORT=3000  # Para algumas plataformas
```

### Arquivos Necessários (já criados):
- ✅ `package.json`
- ✅ `Procfile`
- ✅ `server.js`

## 🧪 Teste Pós-Deploy

Após deploy, teste estas URLs:
```
https://[seu-app].railway.app/api/exams/dashboard
https://[seu-app].railway.app/api/exams/nacional_123/questions
```

## 📊 Monitoramento

### Railway:
- Logs em tempo real no dashboard
- Uso de recursos visível

### Render:
- Logs na aba "Logs"
- Métricas de uso

## 🚨 Troubleshooting

### Erro: Porta já em uso
- Railway/Render definem PORT automaticamente
- Remover `const PORT = process.env.PORT || 3001;` se necessário

### Erro: Banco não encontrado
- Verificar se fixtures estão sendo executadas
- Adicionar endpoint manual para recarregar DB

### Performance
- Para alta carga, considerar PostgreSQL
- Adicionar cache Redis para sessões

---
**Status**: ✅ Pronto para deploy
**Tempo Estimado**: 5-10 minutos por plataforma</content>
<parameter name="filePath">c:\Users\everton.souza\.gemini\antigravity\scratch\FaculNext\DEPLOY_GUIDE.md