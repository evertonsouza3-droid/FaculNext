# Dockerfile para Render e outras plataformas Docker-friendly
# Garante que o serviço suba mesmo quando o Render tenta Docker build

FROM node:20-alpine
WORKDIR /usr/src/app

# Copia e instala dependências
COPY package*.json ./
RUN npm install --production

# Copia o código fonte da aplicação
COPY . ./

# Porta padrão usada pelo app
EXPOSE 3001
ENV PORT=3001

# Inicializa app em produção
CMD ["node", "server.js"]
