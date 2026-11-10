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
