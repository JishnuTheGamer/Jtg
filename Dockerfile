FROM node:22-alpine
RUN apk add --no-cache docker-cli git make g++ python3
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 6767
CMD ["npm", "start"]
