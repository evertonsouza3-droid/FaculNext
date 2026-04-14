# 🚀 FaculNext - Plataforma Educacional

## 📋 Descrição
O FaculNext é uma plataforma educacional completa para preparação ao ENEM, com funcionalidades de cadastro, redação, Score ENEM, dashboard e gamificação.

## 🛠️ Tecnologias
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (migrado para tabelas estruturadas)
- **Frontend**: HTML, CSS, JavaScript puro
- **Deploy**: Pronto para Railway, Render, Vercel, Heroku

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm

### Passos
```bash
# 1. Clone/baixe o projeto
# 2. Instale dependências
npm install

# 3. Execute o servidor
npm start
# ou
node server.js

# 4. Acesse no navegador
http://localhost:3001
```

## 🌐 Implantação em Produção

### 🎯 Opção 1: Railway (Recomendado - Mais Fácil)
```bash
# Script automático
npm run deploy:railway

# Ou manualmente:
# 1. Acesse: https://railway.app
# 2. New Project > Deploy from GitHub
# 3. Conecte seu repo FaculNext
# 4. Railway detectará package.json e Procfile automaticamente
```

### 🔧 Opção 2: Render (Grátis + PostgreSQL)
```bash
npm run deploy:render

# Manual:
# 1. https://render.com > New > Web Service
# 2. Conecte GitHub repo
# 3. Runtime=Node, Start="node server.js"
```

### ⚡ Opção 3: Vercel (Rápido)
```bash
npm run deploy:vercel

# Manual:
# 1. https://vercel.com > Import Project
# 2. Conecte GitHub repo
# 3. Deploy automático
```

### 🐘 Opção 4: Heroku (Clássico)
```bash
npm run deploy:heroku

# Manual (requer Git + Heroku CLI):
# 1. heroku create faculnext-app
# 2. git push heroku main
# 3. heroku open
```

## 📊 Funcionalidades Implementadas

### ✅ Core Completo
- **Cadastro de Usuários**: Com validação e perfil vocacional
- **Sistema de Redação**: Tema semanal + correção simulada
- **Score ENEM**: Avaliação automática com cálculo de nota
- **Dashboard**: Histórico, progresso, conquistas
- **Gamificação**: Sistema de cashback e rankings

### ✅ Melhorias Recentes
- **Banco Estruturado**: Migração completa para SQLite com tabelas
- **APIs RESTful**: Endpoints organizados e documentados
- **Fixtures Automáticas**: Dados iniciais para desenvolvimento
- **Scripts de Deploy**: Automação para múltiplas plataformas

## 🧪 Testes da API

### Dashboard
```bash
curl http://localhost:3001/api/exams/dashboard
```

### Questões do Simulado
```bash
curl http://localhost:3001/api/exams/nacional_123/questions
```

### Avaliação Score ENEM
```bash
curl -X POST http://localhost:3001/api/exams/nacional_123/evaluate \
  -H "Content-Type: application/json" \
  -d '{"respostas":["B","B","B"],"userId":1}'
```

## 📁 Estrutura do Projeto
```
FaculNext/
├── server.js          # Backend principal
├── package.json       # Dependências e scripts
├── Procfile          # Configuração Heroku/Railway
├── deploy.js         # Script de deploy automático
├── DEPLOY_GUIDE.md   # Guia completo de deploy
├── js/               # Frontend JavaScript
├── css/              # Estilos
├── *.html            # Páginas
└── .github/          # GitHub Actions
```

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm start          # Inicia servidor
npm run deploy     # Deploy interativo
npm run deploy:railway  # Deploy Railway
npm run deploy:render   # Deploy Render
npm run deploy:vercel   # Deploy Vercel
npm run deploy:heroku   # Deploy Heroku
```

### Adicionar Novos Exames
1. Inserir na tabela `exams`
2. Adicionar questões em `exam_questions`
3. Adicionar alternativas em `exam_alternatives`

## 📈 Status do Projeto

- ✅ **Backend**: 100% funcional
- ✅ **Banco de Dados**: Migrado e estruturado
- ✅ **APIs**: Testadas e funcionando
- ✅ **Deploy**: Scripts preparados
- 🚧 **Frontend**: Interface básica (pronta para expansão)
- 🚧 **Autenticação**: Sistema básico (expandir para produção)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é open source - veja o arquivo LICENSE para detalhes.

---

**🎓 FaculNext - Transformando estudos em resultados!**
- Simulados com Score ENEM
- Dashboard com gamificação
- Ranking e conquistas
- IA Tutor 24h

## APIs Disponíveis
- POST /api/users/register - Cadastrar usuário
- POST /api/users/:id/vocational - Salvar perfil vocacional
- GET /api/essays/themes/week - Tema da redação
- POST /api/essays/submit - Submeter redação
- GET /api/exams/dashboard - Lista de simulados
- POST /api/exams/:id/session - Iniciar sessão de prova
- POST /api/exams/:id/evaluate - Corrigir simulado
- GET /api/users/:id/dashboard - Dashboard do usuário
- POST /api/users/:id/cashback/claim - Reclamar cashback
- GET /api/trilhas/user/:id - Trilhas personalizadas
- POST /api/checkout/subscribe - Assinar plano
- GET /api/ranking - Ranking geral
- POST /api/ai/chat - Chat com IA Tutor