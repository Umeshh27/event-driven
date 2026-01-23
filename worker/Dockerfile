FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# No ports exposed for worker usually, but we can verify process health
CMD ["npm", "start"]
