# Pakai image node versi terbaru
FROM node:20-alpine

# Tentukan folder kerja di dalam kontainer
WORKDIR /usr/src/app

# Copy file package.json dan install library
COPY package*.json ./
RUN npm install

# Copy semua file project kamu ke dalam kontainer
COPY . .

# Jalankan aplikasi di port 3000
EXPOSE 3000
CMD [ "node", "server.js" ]