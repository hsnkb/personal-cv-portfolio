# 💼 Kişisel CV & Portfolyo Web Sitesi (Yönetim Panelli)

Modern, dinamik, tam duyarlı (responsive) ve yönetim paneline (CMS) sahip kişisel CV ve portfolyo web uygulaması.

---

## 🌟 Öne Çıkan Özellikler

### 1. Ziyaretçi & Portfolyo Görünümü (`/`)
- **Modern & Estetik Arayüz**: Dark mode, cam efekti (glassmorphism) ve modern Tailwind CSS tasarımı.
- **Hero Bölümü**: Profil fotoğrafı, unvan, canlı çalışma durumu rozeti, sayaç istatistikleri ve sosyal ağ bağlantıları.
- **Hakkımda & Yetkinlikler**: Detaylı biyografi, kariyer felsefesi ve temel uzmanlık odakları.
- **İş Deneyimi Zaman Çizelgesi**: Şirketler, tarihler, pozisyonlar, sorumluluklar ve başarı maddeleri.
- **Eğitim & Sertifikalar**: Okullar, bölümler ve akademik başarılar.
- **Kategorize Edilebilir Yetenekler**: Frontend, Backend, Veritabanı, Bulut ve Araçlar kategorileri ve interaktif seviye çubukları.
- **Proje & Çalışma Vitrini**: Kategoriye göre filtreleme, ekran görüntüleri, canlı demo ve GitHub linkleri, detaylı modal önizlemesi.
- **İnteraktif İletişim Formu**: Ziyaretçilerin doğrudan mesaj gönderebilmesi ve bu mesajların anında yönetim paneline düşmesi.
- **Yazdırılabilir CV (A4 / PDF Hazır)**: Tek tıkla kurumsal A4 sayfa formatında görüntüleme ve tarayıcıdan "PDF Olarak Kaydet" imkanı.

### 2. Yönetim Paneli (`/admin`)
- **Güvenli Kimlik Doğrulama**: JWT ve şifrelenmiş (bcrypt) parola ile korunan admin paneli.
- **Genel Bakış & İstatistikler**: Toplam proje, deneyim, yetenek ve okunmamış mesaj sayaçları.
- **Profil Yönetimi**: Ad, soyad, unvan, biyografi, iletişim bilgileri ve sosyal medya linklerini kolayca düzenleme.
- **Görsel Yükleme**: Profil fotoğrafı ve proje ekran görüntülerini bilgisayardan doğrudan yükleyebilme veya URL ile ekleyebilme.
- **Deneyim Yönetimi (CRUD)**: Yeni iş deneyimi ekleme, düzenleme, silme, "Halen çalışıyorum" seçeneği.
- **Eğitim Yönetimi (CRUD)**: Yeni okul veya sertifika ekleme, düzenleme ve silme.
- **Yetenek Yönetimi (CRUD)**: Yetenek adı, kategori ve yüzde çubuğu slider ile yönetimi.
- **Proje Yönetimi (CRUD)**: Projeler ekleme, öne çıkan proje olarak yıldızlama, detaylı açıklama ve linkler.
- **Gelen Kutusu (Mesajlar)**: Ziyaretçilerin iletişim formundan yazdığı mesajları okuma, okundu işaretleme ve silme.
- **Güvenlik & Şifre Değiştirme**: Admin şifresini ve kullanıcı adını panelden değiştirme.
- **Yedekleme & Geri Yükleme**: Tek tıkla tüm site verilerini `cv-portfolio-backup.json` olarak indirme ve gerektiğinde geri yükleme.

---

## 🚀 Başlangıç ve Çalıştırma

### 1. Gereksinimler
- Node.js (v18 veya üzeri)
- npm veya yarn / pnpm

### 2. Sunucuyu Başlatma
```bash
cd "C:\Users\Konumsal35\.gemini\antigravity\scratch\personal-cv-portfolio"
npm start
```
Geliştirme modunda (dosya değişikliklerinde otomatik yeniden başlatma):
```bash
npm run dev
```

### 3. Erişim Adresleri
- **Ana Sayfa (Ziyaretçi Görünümü):** [http://localhost:3000](http://localhost:3000)
- **Yönetim Paneli (Admin CMS):** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Yazdırılabilir / PDF CV Görünümü:** [http://localhost:3000/print-cv](http://localhost:3000/print-cv)

---

## 🔑 Varsayılan Yönetim Paneli Giriş Bilgileri

- **Kullanıcı Adı:** `admin`
- **Şifre:** `admin123`

*(Giriş yaptıktan sonra sol menüdeki **"Şifre & Güvenlik"** sekmesinden şifrenizi istediğiniz an değiştirebilirsiniz).*

---

## 📁 Proje Dosya Yapısı

```
personal-cv-portfolio/
├── package.json               # Bağımlılıklar ve çalıştırma betikleri
├── server.js                  # Express.js REST API ve sunucu yapılandırması
├── data/
│   └── cv-data.json           # Tüm CV, profil, proje ve mesaj veritabanı
├── public/
│   ├── index.html             # Ana CV ve Portfolyo vitrin sayfası
│   ├── admin.html             # Yönetim Paneli arayüzü
│   ├── print-cv.html          # Yazdırılabilir A4 / PDF formatlı CV sayfası
│   ├── css/
│   │   └── style.css          # Özel stil tanımları ve animasyonlar
│   ├── js/
│   │   ├── main.js            # Ana sayfa dinamik veri ve etkileşim motoru
│   │   ├── admin.js           # Admin paneli CRUD ve oturum yönetimi motoru
│   │   └── print-cv.js        # CV yazdırma sayfası motoru
│   └── uploads/               # Yüklenen profil ve proje görselleri
└── README.md                  # Proje dokümantasyonu
```

---

## 💾 Veri Yedekleme
Verileriniz `data/cv-data.json` dosyasında güvenle saklanır. Harici bir veritabanı kurulumu gerektirmez. Paneldeki **"Yedekleme & Geri Yükle"** menüsünden verilerinizi tek tıkla indirebilir veya yükleyebilirsiniz.

---

## 🌐 Normal Hosting (cPanel / Plesk / PHP / Paylaşımlı Hosting) Kurulumu (Docker Gerekmez!)

Eğer standart bir paylaşımlı hosting (cPanel, Plesk, Natro, Turhost, Güzel Hosting, GoDaddy, Hostinger vb.) kullanıyorsanız ve **Docker yoksa**, projeniz 2 farklı yöntemle doğrudan çalışabilir:

### Yöntem A: Klasik PHP Hosting (Node.js Bile Olmayan En Basit Hostingler İçin)
Projenin içine hazır bir **PHP API motoru** (`api/index.php`) ve `.htaccess` yapılandırması entegre edilmiştir.
1. GitHub'daki veya bilgisayarınızdaki tüm proje dosyalarını bir `.zip` dosyası yapın (veya FTP ile bağlanın).
2. Hostinginizin cPanel Dosya Yöneticisine (File Manager) girin.
3. `public_html` klasörünün içine dosyaları çıkartın (yükleyin).
4. `data/` klasörünün yazma izinlerinin (CHMOD 755 veya 777) açık olduğundan emin olun.
5. **Bu kadar!** Siteniz ve yönetim paneliniz doğrudan alan adınızda (`siteniz.com`) Docker'sız ve Node.js'siz çalışır.

### Yöntem B: cPanel "Setup Node.js App" ile Çalıştırma
Birçok cPanel hostingde "Node.js Seçici" (Setup Node.js App) özelliği vardır:
1. cPanel'e girip **"Setup Node.js App"** simgesine tıklayın.
2. **"Create Application"** butonuna basın.
3. **Application startup file** alanına `app.js` (veya `server.js`) yazın.
4. **Application root** olarak dosya klasörünüzü seçin.
5. **"Run NPM Install"** butonuna basarak paketleri kurun ve **"Start"** deyin.

---

## 🚀 Bulut Üzerinden Otomatik Deploy (Canlıya Alma)

Bu proje GitHub ile tam entegre çalışacak şekilde yapılandırılmıştır. GitHub deponuza her `git push` yaptığınızda sitenizin otomatik olarak yayına girmesi için en popüler iki ücretsiz yöntem:

### Seçenek 1: Render.com ile Otomatik Canlıya Alma (Önerilen - Ücretsiz)
1. **[render.com](https://render.com)** adresine gidin ve GitHub hesabınızla giriş yapın.
2. **"New +" -> "Web Service"** seçeneğine tıklayın.
3. GitHub deponuzu (`personal-cv-portfolio`) seçin.
4. Render projedeki `render.yaml` dosyasını otomatik algılayacaktır.
5. **"Create Web Service"** butonuna basın.
6. Artık her GitHub'a kod gönderdiğinizde (push) Render sitenizi otomatik olarak derleyip yayınlayacaktır! Size ücretsiz bir `https://...onrender.com` adresi verecektir.

### Seçenek 2: Railway.app ile Otomatik Deploy
1. **[railway.app](https://railway.app)** adresine gidip GitHub ile giriş yapın.
2. **"New Project" -> "Deploy from GitHub repo"** adımlarını izleyin.
3. Projedeki `Dockerfile` otomatik algılanır ve birkaç saniye içinde canlıya alınır.

### Seçenek 3: Kendi Sunucunuzda Docker ile Çalıştırma
```bash
docker build -t personal-cv .
docker run -d -p 3000:3000 --name cv-app -v $(pwd)/data:/app/data -v $(pwd)/public/uploads:/app/public/uploads personal-cv
```

