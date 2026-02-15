FROM node:20-alpine
WORKDIR /workspace
COPY backend/package*.json backend/
COPY backend/ backend/
COPY shared/ backend/shared/
WORKDIR /workspace/backend
RUN npm install
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
