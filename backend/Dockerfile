FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
# App listens on PORT env (default 3001); in Docker use PORT=3000 to match compose mapping

CMD ["npm", "run", "start:prod"]
