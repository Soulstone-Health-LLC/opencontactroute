FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json .

ENV NODE_ENV=production
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]