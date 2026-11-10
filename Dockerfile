FROM node:20-alpine

# Çalışma dizinini oluştur
WORKDIR /app

# Bağımlılık dosyalarını kopyala
COPY package*.json ./

# Sadece üretim bağımlılıklarını yükle
RUN npm install --omit=dev

# Tüm proje kaynak kodlarını kopyala
COPY . .

# Kalıcı veri ve yükleme klasörlerinin varlığını sağla
RUN mkdir -p /app/data /app/public/uploads

# Port ortam değişkeni ve dinleme portu
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "server.js"]
