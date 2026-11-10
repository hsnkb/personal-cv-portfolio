const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'personal-cv-secret-key-2026-safe-token';
const DATA_FILE = path.join(__dirname, 'data', 'cv-data.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Klasörlerin varlığını garantiye alalım
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer dosya yükleme yapılandırması
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Sadece resim dosyaları (JPG, PNG, GIF, WebP, SVG) yüklenebilir!'));
  }
});

// Middleware'ler
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Yardımcı fonksiyonlar: Veri okuma ve yazma
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Veri dosyası okunamadı:', err);
    return null;
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Veri dosyası kaydedilemedi:', err);
    return false;
  }
}

// Kimlik doğrulama middleware'i
function requireAuth(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
  }
}

// -------------------------------------------------------------
// SAYFA ROTALARI
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/print-cv', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'print-cv.html'));
});

// -------------------------------------------------------------
// GENEL API ROTALARI (Public)
// -------------------------------------------------------------

// Tüm herkese açık CV ve portfolyo verisini getir
app.get('/api/cv', (req, res) => {
  const data = readData();
  if (!data) {
    return res.status(500).json({ success: false, message: 'Veri yüklenemedi.' });
  }

  // Güvenlik ve gizli mesajları çıkarıp döndür
  const publicData = {
    profile: data.profile,
    about: data.about,
    experiences: data.experiences || [],
    educations: data.educations || [],
    skills: data.skills || [],
    projects: data.projects || []
  };

  res.json({ success: true, data: publicData });
});

// İletişim formu mesajı kaydetme
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'İsim, e-posta ve mesaj alanları zorunludur.' });
  }

  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  if (!Array.isArray(data.messages)) {
    data.messages = [];
  }

  const newMessage = {
    id: 'msg-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    subject: subject ? subject.trim() : 'Konu belirtilmedi',
    message: message.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };

  data.messages.unshift(newMessage);
  writeData(data);

  res.json({ success: true, message: 'Mesajınız başarıyla iletildi! En kısa sürede geri dönüş yapılacaktır.' });
});

// Admin Girişi
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre zorunludur.' });
  }

  const data = readData();
  if (!data || !data.security) {
    return res.status(500).json({ success: false, message: 'Sistem güvenlik ayarları bulunamadı.' });
  }

  const isUserValid = (username === data.security.adminUsername);
  const isPassValid = bcrypt.compareSync(password, data.security.adminPasswordHash);

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });
  }

  const token = jwt.sign({ username: data.security.adminUsername }, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('auth_token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  });

  res.json({
    success: true,
    message: 'Giriş başarılı!',
    token,
    user: { username: data.security.adminUsername }
  });
});

// Admin Çıkışı
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
});

// Admin Oturum Kontrolü
app.get('/api/auth/check', (req, res) => {
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

// -------------------------------------------------------------
// YÖNETİM PANELİ KORUMALI API ROTALARI
// -------------------------------------------------------------

// Tüm yönetim verisini getir (istatistikler, mesajlar dahil)
app.get('/api/admin/data', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Veri okunamadı.' });

  const safeData = {
    profile: data.profile,
    about: data.about,
    experiences: data.experiences || [],
    educations: data.educations || [],
    skills: data.skills || [],
    projects: data.projects || [],
    messages: data.messages || [],
    username: data.security.adminUsername
  };

  res.json({ success: true, data: safeData });
});

// Profil güncelle
app.put('/api/admin/profile', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.profile = {
    ...data.profile,
    ...req.body
  };

  writeData(data);
  res.json({ success: true, message: 'Profil bilgileri güncellendi.', profile: data.profile });
});

// Hakkımda güncelle
app.put('/api/admin/about', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.about = {
    ...data.about,
    ...req.body
  };

  writeData(data);
  res.json({ success: true, message: 'Hakkımda bilgileri güncellendi.', about: data.about });
});

// DENEYİMLER (CRUD)
app.post('/api/admin/experiences', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const item = {
    id: 'exp-' + Date.now(),
    title: req.body.title || '',
    company: req.body.company || '',
    location: req.body.location || '',
    startDate: req.body.startDate || '',
    endDate: req.body.current ? 'Günümüz' : (req.body.endDate || ''),
    current: !!req.body.current,
    description: req.body.description || '',
    achievements: Array.isArray(req.body.achievements) ? req.body.achievements : (req.body.achievements ? req.body.achievements.split('\n').filter(Boolean) : []),
    technologies: Array.isArray(req.body.technologies) ? req.body.technologies : (req.body.technologies ? req.body.technologies.split(',').map(s => s.trim()).filter(Boolean) : [])
  };

  if (!data.experiences) data.experiences = [];
  data.experiences.unshift(item);
  writeData(data);

  res.json({ success: true, message: 'Deneyim başarıyla eklendi.', item });
});

app.put('/api/admin/experiences/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const index = data.experiences.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Deneyim bulunamadı.' });

  data.experiences[index] = {
    ...data.experiences[index],
    title: req.body.title,
    company: req.body.company,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.current ? 'Günümüz' : (req.body.endDate || ''),
    current: !!req.body.current,
    description: req.body.description,
    achievements: Array.isArray(req.body.achievements) ? req.body.achievements : (req.body.achievements ? req.body.achievements.split('\n').filter(Boolean) : []),
    technologies: Array.isArray(req.body.technologies) ? req.body.technologies : (req.body.technologies ? req.body.technologies.split(',').map(s => s.trim()).filter(Boolean) : [])
  };

  writeData(data);
  res.json({ success: true, message: 'Deneyim güncellendi.', item: data.experiences[index] });
});

app.delete('/api/admin/experiences/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.experiences = data.experiences.filter(e => e.id !== req.params.id);
  writeData(data);

  res.json({ success: true, message: 'Deneyim silindi.' });
});

// EĞİTİMLER (CRUD)
app.post('/api/admin/educations', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const item = {
    id: 'edu-' + Date.now(),
    degree: req.body.degree || '',
    school: req.body.school || '',
    startDate: req.body.startDate || '',
    endDate: req.body.endDate || '',
    description: req.body.description || ''
  };

  if (!data.educations) data.educations = [];
  data.educations.unshift(item);
  writeData(data);

  res.json({ success: true, message: 'Eğitim bilgisi eklendi.', item });
});

app.put('/api/admin/educations/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const index = data.educations.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Eğitim bulunamadı.' });

  data.educations[index] = {
    ...data.educations[index],
    degree: req.body.degree,
    school: req.body.school,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    description: req.body.description
  };

  writeData(data);
  res.json({ success: true, message: 'Eğitim güncellendi.', item: data.educations[index] });
});

app.delete('/api/admin/educations/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.educations = data.educations.filter(e => e.id !== req.params.id);
  writeData(data);

  res.json({ success: true, message: 'Eğitim silindi.' });
});

// YETENEKLER (CRUD)
app.post('/api/admin/skills', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const item = {
    id: 'sk-' + Date.now(),
    category: req.body.category || 'Diğer',
    name: req.body.name || '',
    level: parseInt(req.body.level) || 80,
    icon: req.body.icon || 'code'
  };

  if (!data.skills) data.skills = [];
  data.skills.push(item);
  writeData(data);

  res.json({ success: true, message: 'Yetenek eklendi.', item });
});

app.put('/api/admin/skills/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const index = data.skills.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Yetenek bulunamadı.' });

  data.skills[index] = {
    ...data.skills[index],
    category: req.body.category || 'Diğer',
    name: req.body.name,
    level: parseInt(req.body.level) || 80,
    icon: req.body.icon || 'code'
  };

  writeData(data);
  res.json({ success: true, message: 'Yetenek güncellendi.', item: data.skills[index] });
});

app.delete('/api/admin/skills/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.skills = data.skills.filter(s => s.id !== req.params.id);
  writeData(data);

  res.json({ success: true, message: 'Yetenek silindi.' });
});

// PROJELER (CRUD)
app.post('/api/admin/projects', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? req.body.tags.split(',').map(s => s.trim()).filter(Boolean) : []);
  const highlights = Array.isArray(req.body.highlights) ? req.body.highlights : (req.body.highlights ? req.body.highlights.split('\n').map(s => s.trim()).filter(Boolean) : []);

  const item = {
    id: 'proj-' + Date.now(),
    title: req.body.title || '',
    category: req.body.category || 'Web',
    summary: req.body.summary || '',
    description: req.body.description || '',
    image: req.body.image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
    tags: tags,
    demoUrl: req.body.demoUrl || '',
    githubUrl: req.body.githubUrl || '',
    featured: !!req.body.featured,
    highlights: highlights
  };

  if (!data.projects) data.projects = [];
  data.projects.unshift(item);
  writeData(data);

  res.json({ success: true, message: 'Proje başarıyla eklendi.', item });
});

app.put('/api/admin/projects/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const index = data.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Proje bulunamadı.' });

  const tags = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? req.body.tags.split(',').map(s => s.trim()).filter(Boolean) : []);
  const highlights = Array.isArray(req.body.highlights) ? req.body.highlights : (req.body.highlights ? req.body.highlights.split('\n').map(s => s.trim()).filter(Boolean) : []);

  data.projects[index] = {
    ...data.projects[index],
    title: req.body.title,
    category: req.body.category,
    summary: req.body.summary,
    description: req.body.description,
    image: req.body.image,
    tags: tags,
    demoUrl: req.body.demoUrl,
    githubUrl: req.body.githubUrl,
    featured: !!req.body.featured,
    highlights: highlights
  };

  writeData(data);
  res.json({ success: true, message: 'Proje güncellendi.', item: data.projects[index] });
});

app.delete('/api/admin/projects/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.projects = data.projects.filter(p => p.id !== req.params.id);
  writeData(data);

  res.json({ success: true, message: 'Proje silindi.' });
});

// MESAJLAR (Gelen Kutusu)
app.get('/api/admin/messages', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  res.json({ success: true, messages: data.messages || [] });
});

app.patch('/api/admin/messages/:id/read', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  const msg = (data.messages || []).find(m => m.id === req.params.id);
  if (msg) {
    msg.read = (req.body.read !== undefined) ? req.body.read : true;
    writeData(data);
  }

  res.json({ success: true, message: 'Mesaj durumu güncellendi.' });
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Sunucu hatası.' });

  data.messages = (data.messages || []).filter(m => m.id !== req.params.id);
  writeData(data);

  res.json({ success: true, message: 'Mesaj silindi.' });
});

// DOSYA YÜKLEME (Profil fotoğrafı & Proje görseli)
app.post('/api/admin/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Lütfen yüklenecek bir dosya seçin.' });
    }

    const fileUrl = '/uploads/' + req.file.filename;
    res.json({ success: true, message: 'Dosya başarıyla yüklendi.', url: fileUrl });
  });
});

// ŞİFRE DEĞİŞTİRME
app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Mevcut ve yeni şifre gereklidir.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Yeni şifre en az 6 karakter olmalıdır.' });
  }

  const data = readData();
  if (!data || !data.security) return res.status(500).json({ success: false, message: 'Güvenlik ayarları bulunamadı.' });

  const isMatch = bcrypt.compareSync(currentPassword, data.security.adminPasswordHash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Mevcut şifreniz hatalı.' });
  }

  data.security.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
  if (newUsername && newUsername.trim()) {
    data.security.adminUsername = newUsername.trim();
  }

  writeData(data);
  res.json({ success: true, message: 'Şifreniz başarıyla güncellendi!' });
});

// YEDEK DIŞA / İÇE AKTARMA (Backup & Restore)
app.get('/api/admin/export', requireAuth, (req, res) => {
  const data = readData();
  if (!data) return res.status(500).json({ success: false, message: 'Veri okunamadı.' });

  res.setHeader('Content-disposition', 'attachment; filename=cv-portfolio-backup.json');
  res.setHeader('Content-type', 'application/json');
  res.write(JSON.stringify(data, null, 2));
  res.end();
});

app.post('/api/admin/import', requireAuth, (req, res) => {
  const importedData = req.body;
  if (!importedData || !importedData.profile || !importedData.security) {
    return res.status(400).json({ success: false, message: 'Geçersiz veri yedekleme formatı.' });
  }

  writeData(importedData);
  res.json({ success: true, message: 'Veriler başarıyla içe aktarıldı ve geri yüklendi!' });
});

// SUNUCUYU BAŞLAT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Kişisel CV & Portfolyo Web Sitesi Yayında!`);
  console.log(`🌐 Ana Sayfa (Ziyaretçi Görünümü): http://localhost:${PORT}`);
  console.log(`⚙️  Yönetim Paneli (Admin):         http://localhost:${PORT}/admin`);
  console.log(`📄 Yazdırılabilir CV (PDF Hazır):  http://localhost:${PORT}/print-cv`);
  console.log(`🔑 Varsayılan Giriş: admin / admin123`);
  console.log(`====================================================`);
});
