// Admin Panel JavaScript Yönetim Motoru
let adminData = null;

// Toast Bildirimi Gösterme
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info');
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons({ root: toast });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Güvenli HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Modal Açma / Kapama Yardımcıları
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

// Sekme Değiştirme
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.classList.remove('active', 'bg-brand-600', 'text-white');
    b.classList.add('text-slate-300', 'hover:bg-white/5');
  });

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.remove('hidden');
  }

  const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-600', 'text-white');
    activeBtn.classList.remove('text-slate-300', 'hover:bg-white/5');
  }

  lucide.createIcons();
}

// Sayfa Başlatma & Oturum Kontrolü
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuth();
});

// Dinleyicileri Kurma
function setupEventListeners() {
  // Tab geçişleri
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Şifre Göster/Gizle Butonu
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const passInput = document.getElementById('login-password');
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPassword = passInput.getAttribute('type') === 'password';
      passInput.setAttribute('type', isPassword ? 'text' : 'password');
    });
  }

  // Giriş Formu
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Çıkış Butonu
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Profil Formu Kaydet
  document.getElementById('profile-form')?.addEventListener('submit', saveProfile);

  // Hakkımda Formu Kaydet
  document.getElementById('about-form')?.addEventListener('submit', saveAbout);

  // Deneyim Formu Kaydet
  document.getElementById('exp-form')?.addEventListener('submit', saveExperience);

  // Eğitim Formu Kaydet
  document.getElementById('edu-form')?.addEventListener('submit', saveEducation);

  // Yetenek Formu Kaydet
  document.getElementById('skill-form')?.addEventListener('submit', saveSkill);
  document.getElementById('skill-level')?.addEventListener('input', (e) => {
    document.getElementById('skill-level-val').innerText = e.target.value + '%';
  });

  // Proje Formu Kaydet
  document.getElementById('project-form')?.addEventListener('submit', saveProject);

  // Şifre Değiştir Formu Kaydet
  document.getElementById('password-form')?.addEventListener('submit', savePassword);

  // Avatar Dosya Yükleme
  const avatarInput = document.getElementById('avatar-file-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        await uploadImageFile(e.target.files[0], (url) => {
          document.getElementById('prof-avatar-url').value = url;
          document.getElementById('profile-avatar-preview').src = url;
        });
      }
    });
  }

  // Proje Görseli Dosya Yükleme
  const projFileInput = document.getElementById('proj-file-input');
  if (projFileInput) {
    projFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        await uploadImageFile(e.target.files[0], (url) => {
          document.getElementById('proj-image').value = url;
          document.getElementById('proj-img-preview').src = url;
        });
      }
    });
  }

  // Proje Görsel URL Değişimi Önizlemesi
  document.getElementById('proj-image')?.addEventListener('input', (e) => {
    document.getElementById('proj-img-preview').src = e.target.value || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&q=80';
  });
}

// Oturum Doğrulama Kontrolü
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated) {
      showAdminView();
      await fetchAdminData();
    } else {
      showLoginView();
    }
  } catch (err) {
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('admin-view').classList.add('hidden');
  lucide.createIcons();
}

function showAdminView() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('admin-view').classList.remove('hidden');
  switchTab('overview');
  lucide.createIcons();
}

// Giriş İşlemi
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
    <span>Giriş yapılıyor...</span>
  `;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();

    if (result.success) {
      showToast('Giriş başarılı!', 'success');
      showAdminView();
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kullanıcı adı veya şifre hatalı.', 'error');
    }
  } catch (err) {
    showToast('Sunucu bağlantı hatası oluştu.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <i data-lucide="log-in" class="w-4 h-4"></i>
      <span>Panele Giriş Yap</span>
    `;
    lucide.createIcons({ root: submitBtn });
  }
}

// Çıkış İşlemi
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Oturum kapatıldı.', 'info');
    showLoginView();
  } catch (err) {
    showLoginView();
  }
}

// Resim Yükleme Servisi
async function uploadImageFile(file, onSuccess) {
  const formData = new FormData();
  formData.append('file', file);

  showToast('Görsel sunucuya yükleniyor...', 'info');

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.success && result.url) {
      showToast('Görsel başarıyla yüklendi!', 'success');
      onSuccess(result.url);
    } else {
      showToast(result.message || 'Görsel yüklenemedi.', 'error');
    }
  } catch (err) {
    showToast('Görsel yüklenirken sunucu hatası oluştu.', 'error');
  }
}

// Yönetim Verisini Çekme
async function fetchAdminData() {
  try {
    const res = await fetch('/api/admin/data');
    const result = await res.json();
    if (result.success && result.data) {
      adminData = result.data;
      renderAdminAll();
    } else {
      showToast('Veriler yüklenemedi.', 'error');
    }
  } catch (err) {
    showToast('Veri alırken bağlantı hatası.', 'error');
  }
}

// Tüm Yönetim Görünümlerini Render Etme
function renderAdminAll() {
  if (!adminData) return;

  renderOverview();
  renderProfileTab();
  renderAboutTab();
  renderExperiencesTab();
  renderEducationsTab();
  renderSkillsTab();
  renderProjectsTab();
  renderMessagesTab();

  lucide.createIcons();
}

// 1. Genel Bakış Render
function renderOverview() {
  const p = adminData.projects || [];
  const e = adminData.experiences || [];
  const s = adminData.skills || [];
  const m = adminData.messages || [];

  document.getElementById('dash-stat-projects').innerText = p.length;
  document.getElementById('dash-stat-experiences').innerText = e.length;
  document.getElementById('dash-stat-skills').innerText = s.length;
  document.getElementById('dash-stat-messages').innerText = m.length;

  // Okunmamış mesaj rozeti
  const unreadCount = m.filter(msg => !msg.read).length;
  const badge = document.getElementById('unread-msg-badge');
  if (unreadCount > 0) {
    badge.innerText = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  // Son Mesajlar
  const container = document.getElementById('overview-recent-messages');
  container.innerHTML = '';

  if (m.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 py-2">Henüz ziyaretçi mesajı yok.</p>';
    return;
  }

  m.slice(0, 3).forEach(msg => {
    const div = document.createElement('div');
    div.className = `p-3 rounded-xl border flex items-center justify-between gap-4 ${msg.read ? 'bg-white/5 border-white/5' : 'bg-brand-500/10 border-brand-500/30'}`;
    div.innerHTML = `
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-white">${escapeHtml(msg.name)}</span>
          <span class="text-[10px] text-slate-400">(${escapeHtml(msg.email)})</span>
          ${!msg.read ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-brand-500 text-white font-semibold">Yeni</span>' : ''}
        </div>
        <div class="text-xs text-slate-300 truncate mt-0.5">${escapeHtml(msg.subject || msg.message)}</div>
      </div>
      <button onclick="switchTab('messages')" class="text-xs text-brand-400 hover:text-brand-300 shrink-0 font-medium">İncele</button>
    `;
    container.appendChild(div);
  });
}

// 2. Profil Sekmesi Doldurma
function renderProfileTab() {
  const p = adminData.profile || {};
  const s = p.social || {};
  const stats = p.stats || {};

  document.getElementById('prof-avatar-url').value = p.avatar || '';
  document.getElementById('profile-avatar-preview').src = p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
  document.getElementById('prof-name').value = p.name || '';
  document.getElementById('prof-title').value = p.title || '';
  document.getElementById('prof-email').value = p.email || '';
  document.getElementById('prof-phone').value = p.phone || '';
  document.getElementById('prof-location').value = p.location || '';
  document.getElementById('prof-status').value = p.status || '';
  document.getElementById('prof-bio').value = p.bio || '';

  document.getElementById('prof-github').value = s.github || '';
  document.getElementById('prof-linkedin').value = s.linkedin || '';
  document.getElementById('prof-twitter').value = s.twitter || '';
  document.getElementById('prof-website').value = s.website || '';

  document.getElementById('prof-stat-years').value = stats.yearsExperience || '';
  document.getElementById('prof-stat-projects').value = stats.completedProjects || '';
  document.getElementById('prof-stat-clients').value = stats.happyClients || '';
}

// Profil Kaydetme
async function saveProfile(e) {
  e.preventDefault();

  const payload = {
    avatar: document.getElementById('prof-avatar-url').value.trim(),
    name: document.getElementById('prof-name').value.trim(),
    title: document.getElementById('prof-title').value.trim(),
    email: document.getElementById('prof-email').value.trim(),
    phone: document.getElementById('prof-phone').value.trim(),
    location: document.getElementById('prof-location').value.trim(),
    status: document.getElementById('prof-status').value.trim(),
    bio: document.getElementById('prof-bio').value.trim(),
    social: {
      github: document.getElementById('prof-github').value.trim(),
      linkedin: document.getElementById('prof-linkedin').value.trim(),
      twitter: document.getElementById('prof-twitter').value.trim(),
      website: document.getElementById('prof-website').value.trim()
    },
    stats: {
      yearsExperience: document.getElementById('prof-stat-years').value.trim(),
      completedProjects: document.getElementById('prof-stat-projects').value.trim(),
      happyClients: document.getElementById('prof-stat-clients').value.trim()
    }
  };

  try {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Profil bilgileri kaydedildi!', 'success');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 3. Hakkımda Sekmesi Doldurma
function renderAboutTab() {
  const a = adminData.about || {};
  document.getElementById('about-intro').value = a.intro || '';
  document.getElementById('about-paragraphs').value = (a.paragraphs || []).join('\n\n');
  document.getElementById('about-highlights').value = (a.highlights || []).join('\n');
}

// Hakkımda Kaydetme
async function saveAbout(e) {
  e.preventDefault();

  const paragraphs = document.getElementById('about-paragraphs').value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const highlights = document.getElementById('about-highlights').value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const payload = {
    title: 'Hakkımda',
    intro: document.getElementById('about-intro').value.trim(),
    paragraphs,
    highlights
  };

  try {
    const res = await fetch('/api/admin/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Hakkımda bilgileri güncellendi!', 'success');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt hatası.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 4. Deneyimler Sekmesi & CRUD
function renderExperiencesTab() {
  const container = document.getElementById('admin-experience-list');
  const experiences = adminData.experiences || [];
  container.innerHTML = '';

  if (experiences.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 p-4">Henüz kayıtlı deneyim yok.</p>';
    return;
  }

  experiences.forEach(exp => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4';
    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-white">${escapeHtml(exp.title)}</h4>
          <span class="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
            ${escapeHtml(exp.startDate)} — ${exp.current ? 'Günümüz' : escapeHtml(exp.endDate)}
          </span>
        </div>
        <div class="text-xs text-slate-400 font-medium">${escapeHtml(exp.company)} ${exp.location ? `• ${escapeHtml(exp.location)}` : ''}</div>
        <p class="text-xs text-slate-300 line-clamp-2">${escapeHtml(exp.description)}</p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button onclick="editExperience('${exp.id}')" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition" title="Düzenle">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteExperience('${exp.id}')" class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition" title="Sil">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openExperienceModal() {
  document.getElementById('modal-exp-title').innerText = 'Yeni Deneyim Ekle';
  document.getElementById('exp-id').value = '';
  document.getElementById('exp-pos').value = '';
  document.getElementById('exp-comp').value = '';
  document.getElementById('exp-loc').value = '';
  document.getElementById('exp-start').value = '';
  document.getElementById('exp-end').value = '';
  document.getElementById('exp-current').checked = false;
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-achievements').value = '';
  document.getElementById('exp-techs').value = '';

  openModal('modal-experience');
  lucide.createIcons();
}

function editExperience(id) {
  const exp = (adminData.experiences || []).find(e => e.id === id);
  if (!exp) return;

  document.getElementById('modal-exp-title').innerText = 'Deneyimi Düzenle';
  document.getElementById('exp-id').value = exp.id;
  document.getElementById('exp-pos').value = exp.title || '';
  document.getElementById('exp-comp').value = exp.company || '';
  document.getElementById('exp-loc').value = exp.location || '';
  document.getElementById('exp-start').value = exp.startDate || '';
  document.getElementById('exp-end').value = exp.endDate || '';
  document.getElementById('exp-current').checked = !!exp.current;
  document.getElementById('exp-desc').value = exp.description || '';
  document.getElementById('exp-achievements').value = (exp.achievements || []).join('\n');
  document.getElementById('exp-techs').value = (exp.technologies || []).join(', ');

  openModal('modal-experience');
  lucide.createIcons();
}

async function saveExperience(e) {
  e.preventDefault();
  const id = document.getElementById('exp-id').value;
  const payload = {
    title: document.getElementById('exp-pos').value.trim(),
    company: document.getElementById('exp-comp').value.trim(),
    location: document.getElementById('exp-loc').value.trim(),
    startDate: document.getElementById('exp-start').value.trim(),
    endDate: document.getElementById('exp-end').value.trim(),
    current: document.getElementById('exp-current').checked,
    description: document.getElementById('exp-desc').value.trim(),
    achievements: document.getElementById('exp-achievements').value.split('\n').map(s => s.trim()).filter(Boolean),
    technologies: document.getElementById('exp-techs').value.split(',').map(s => s.trim()).filter(Boolean)
  };

  const url = id ? `/api/admin/experiences/${id}` : '/api/admin/experiences';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message || 'Deneyim kaydedildi!', 'success');
      closeModal('modal-experience');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

async function deleteExperience(id) {
  if (!confirm('Bu deneyimi silmek istediğinizden emin misiniz?')) return;

  try {
    const res = await fetch(`/api/admin/experiences/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Deneyim silindi.', 'success');
      await fetchAdminData();
    } else {
      showToast('Silme işlemi başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 5. Eğitim Sekmesi & CRUD
function renderEducationsTab() {
  const container = document.getElementById('admin-education-list');
  const educations = adminData.educations || [];
  container.innerHTML = '';

  if (educations.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 p-4">Henüz kayıtlı eğitim yok.</p>';
    return;
  }

  educations.forEach(edu => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-5 flex items-center justify-between gap-4';
    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-white">${escapeHtml(edu.degree)}</h4>
          <span class="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            ${escapeHtml(edu.startDate)} — ${escapeHtml(edu.endDate)}
          </span>
        </div>
        <div class="text-xs text-slate-300">${escapeHtml(edu.school)}</div>
        ${edu.description ? `<p class="text-xs text-slate-400">${escapeHtml(edu.description)}</p>` : ''}
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button onclick="editEducation('${edu.id}')" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteEducation('${edu.id}')" class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openEducationModal() {
  document.getElementById('modal-edu-title').innerText = 'Yeni Eğitim Ekle';
  document.getElementById('edu-id').value = '';
  document.getElementById('edu-degree').value = '';
  document.getElementById('edu-school').value = '';
  document.getElementById('edu-start').value = '';
  document.getElementById('edu-end').value = '';
  document.getElementById('edu-desc').value = '';

  openModal('modal-education');
  lucide.createIcons();
}

function editEducation(id) {
  const edu = (adminData.educations || []).find(e => e.id === id);
  if (!edu) return;

  document.getElementById('modal-edu-title').innerText = 'Eğitimi Düzenle';
  document.getElementById('edu-id').value = edu.id;
  document.getElementById('edu-degree').value = edu.degree || '';
  document.getElementById('edu-school').value = edu.school || '';
  document.getElementById('edu-start').value = edu.startDate || '';
  document.getElementById('edu-end').value = edu.endDate || '';
  document.getElementById('edu-desc').value = edu.description || '';

  openModal('modal-education');
  lucide.createIcons();
}

async function saveEducation(e) {
  e.preventDefault();
  const id = document.getElementById('edu-id').value;
  const payload = {
    degree: document.getElementById('edu-degree').value.trim(),
    school: document.getElementById('edu-school').value.trim(),
    startDate: document.getElementById('edu-start').value.trim(),
    endDate: document.getElementById('edu-end').value.trim(),
    description: document.getElementById('edu-desc').value.trim()
  };

  const url = id ? `/api/admin/educations/${id}` : '/api/admin/educations';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Eğitim bilgisi kaydedildi!', 'success');
      closeModal('modal-education');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

async function deleteEducation(id) {
  if (!confirm('Bu eğitim bilgisini silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/educations/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Eğitim silindi.', 'success');
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 6. Yetenekler Sekmesi & CRUD
function renderSkillsTab() {
  const container = document.getElementById('admin-skills-list');
  const skills = adminData.skills || [];
  container.innerHTML = '';

  if (skills.length === 0) {
    container.innerHTML = '<p class="col-span-full text-xs text-slate-500 p-4">Henüz kayıtlı yetenek yok.</p>';
    return;
  }

  skills.forEach(skill => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-4 flex items-center justify-between gap-3';
    card.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-white truncate">${escapeHtml(skill.name)}</span>
          <span class="text-xs font-mono font-bold text-brand-400">${skill.level}%</span>
        </div>
        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-2">${escapeHtml(skill.category)}</div>
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-brand-500 h-full rounded-full" style="width: ${skill.level}%"></div>
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0 ml-2">
        <button onclick="editSkill('${skill.id}')" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="deleteSkill('${skill.id}')" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openSkillModal() {
  document.getElementById('modal-skill-title').innerText = 'Yeni Yetenek Ekle';
  document.getElementById('skill-id').value = '';
  document.getElementById('skill-name').value = '';
  document.getElementById('skill-category').value = 'Frontend';
  document.getElementById('skill-level').value = 85;
  document.getElementById('skill-level-val').innerText = '85%';
  document.getElementById('skill-icon').value = 'code';

  openModal('modal-skill');
  lucide.createIcons();
}

function editSkill(id) {
  const s = (adminData.skills || []).find(item => item.id === id);
  if (!s) return;

  document.getElementById('modal-skill-title').innerText = 'Yeteneği Düzenle';
  document.getElementById('skill-id').value = s.id;
  document.getElementById('skill-name').value = s.name || '';
  document.getElementById('skill-category').value = s.category || 'Frontend';
  document.getElementById('skill-level').value = s.level || 80;
  document.getElementById('skill-level-val').innerText = (s.level || 80) + '%';
  document.getElementById('skill-icon').value = s.icon || 'code';

  openModal('modal-skill');
  lucide.createIcons();
}

async function saveSkill(e) {
  e.preventDefault();
  const id = document.getElementById('skill-id').value;
  const payload = {
    name: document.getElementById('skill-name').value.trim(),
    category: document.getElementById('skill-category').value,
    level: parseInt(document.getElementById('skill-level').value) || 80,
    icon: document.getElementById('skill-icon').value.trim() || 'code'
  };

  const url = id ? `/api/admin/skills/${id}` : '/api/admin/skills';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Yetenek kaydedildi!', 'success');
      closeModal('modal-skill');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

async function deleteSkill(id) {
  if (!confirm('Bu yeteneği silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/skills/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Yetenek silindi.', 'success');
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 7. Projeler Sekmesi & CRUD
function renderProjectsTab() {
  const container = document.getElementById('admin-projects-list');
  const projects = adminData.projects || [];
  container.innerHTML = '';

  if (projects.length === 0) {
    container.innerHTML = '<p class="col-span-full text-xs text-slate-500 p-4">Henüz kayıtlı proje yok.</p>';
    return;
  }

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-4 flex gap-4 items-start';
    card.innerHTML = `
      <img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}" class="w-24 h-20 rounded-xl object-cover bg-slate-800 shrink-0 border border-white/10">
      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-white truncate">${escapeHtml(proj.title)}</h4>
          ${proj.featured ? '<span class="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">★ Öne Çıkan</span>' : ''}
        </div>
        <div class="text-[11px] text-brand-400 font-medium">${escapeHtml(proj.category)}</div>
        <p class="text-xs text-slate-400 line-clamp-2">${escapeHtml(proj.summary || proj.description)}</p>
      </div>

      <div class="flex flex-col gap-1.5 shrink-0">
        <button onclick="editProject('${proj.id}')" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition" title="Düzenle">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteProject('${proj.id}')" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition" title="Sil">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openProjectEditModal() {
  document.getElementById('modal-proj-title').innerText = 'Yeni Proje Ekle';
  document.getElementById('proj-id').value = '';
  document.getElementById('proj-title').value = '';
  document.getElementById('proj-category').value = '';
  document.getElementById('proj-featured').checked = false;
  document.getElementById('proj-image').value = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80';
  document.getElementById('proj-img-preview').src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80';
  document.getElementById('proj-summary').value = '';
  document.getElementById('proj-desc').value = '';
  document.getElementById('proj-highlights').value = '';
  document.getElementById('proj-tags').value = '';
  document.getElementById('proj-demourl').value = '';
  document.getElementById('proj-githuburl').value = '';

  openModal('modal-project');
  lucide.createIcons();
}

function editProject(id) {
  const p = (adminData.projects || []).find(item => item.id === id);
  if (!p) return;

  document.getElementById('modal-proj-title').innerText = 'Projeyi Düzenle';
  document.getElementById('proj-id').value = p.id;
  document.getElementById('proj-title').value = p.title || '';
  document.getElementById('proj-category').value = p.category || '';
  document.getElementById('proj-featured').checked = !!p.featured;
  document.getElementById('proj-image').value = p.image || '';
  document.getElementById('proj-img-preview').src = p.image || '';
  document.getElementById('proj-summary').value = p.summary || '';
  document.getElementById('proj-desc').value = p.description || '';
  document.getElementById('proj-highlights').value = (p.highlights || []).join('\n');
  document.getElementById('proj-tags').value = (p.tags || []).join(', ');
  document.getElementById('proj-demourl').value = p.demoUrl || '';
  document.getElementById('proj-githuburl').value = p.githubUrl || '';

  openModal('modal-project');
  lucide.createIcons();
}

async function saveProject(e) {
  e.preventDefault();
  const id = document.getElementById('proj-id').value;
  const payload = {
    title: document.getElementById('proj-title').value.trim(),
    category: document.getElementById('proj-category').value.trim(),
    featured: document.getElementById('proj-featured').checked,
    image: document.getElementById('proj-image').value.trim(),
    summary: document.getElementById('proj-summary').value.trim(),
    description: document.getElementById('proj-desc').value.trim(),
    highlights: document.getElementById('proj-highlights').value.split('\n').map(s => s.trim()).filter(Boolean),
    tags: document.getElementById('proj-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    demoUrl: document.getElementById('proj-demourl').value.trim(),
    githubUrl: document.getElementById('proj-githuburl').value.trim()
  };

  const url = id ? `/api/admin/projects/${id}` : '/api/admin/projects';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Proje başarıyla kaydedildi!', 'success');
      closeModal('modal-project');
      await fetchAdminData();
    } else {
      showToast(result.message || 'Kayıt başarısız.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

async function deleteProject(id) {
  if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Proje silindi.', 'success');
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 8. Mesajlar Sekmesi
function renderMessagesTab() {
  const container = document.getElementById('admin-messages-list');
  const messages = adminData.messages || [];
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 p-4">Henüz gelen mesajınız bulunmuyor.</p>';
    return;
  }

  messages.forEach(msg => {
    const card = document.createElement('div');
    card.className = `glass-card rounded-2xl p-5 space-y-3 border ${msg.read ? 'border-white/5 opacity-80' : 'border-brand-500/40 bg-brand-950/20'}`;
    
    const formattedDate = new Date(msg.createdAt).toLocaleString('tr-TR');

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white">${escapeHtml(msg.name)}</span>
            <span class="text-xs text-brand-400">(${escapeHtml(msg.email)})</span>
            ${!msg.read ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-brand-500 text-white font-bold">Yeni Mesaj</span>' : ''}
          </div>
          <div class="text-xs text-slate-400 mt-0.5">Konu: <span class="text-slate-200 font-medium">${escapeHtml(msg.subject)}</span></div>
        </div>
        <div class="text-[11px] text-slate-500">${formattedDate}</div>
      </div>

      <div class="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line py-1">
        ${escapeHtml(msg.message)}
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-white/5">
        <a href="mailto:${escapeHtml(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject)}" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300">
          <i data-lucide="reply" class="w-3.5 h-3.5"></i>
          <span>E-Posta ile Cevapla</span>
        </a>

        <div class="flex items-center gap-2">
          <button onclick="toggleMessageRead('${msg.id}', ${!msg.read})" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300">
            ${msg.read ? 'Okunmadı İşaretle' : 'Okundu İşaretle'}
          </button>
          <button onclick="deleteMessage('${msg.id}')" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function toggleMessageRead(id, readState) {
  try {
    const res = await fetch(`/api/admin/messages/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: readState })
    });
    const result = await res.json();
    if (result.success) {
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Hata oluştu.', 'error');
  }
}

async function deleteMessage(id) {
  if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Mesaj silindi.', 'success');
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 9. Şifre Değiştirme
async function savePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('sec-current-pass').value;
  const newPassword = document.getElementById('sec-new-pass').value;
  const newUsername = document.getElementById('sec-username').value.trim();

  if (newPassword.length < 6) {
    showToast('Yeni şifre en az 6 karakter olmalıdır.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, newUsername })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message || 'Şifre güncellendi!', 'success');
      document.getElementById('sec-current-pass').value = '';
      document.getElementById('sec-new-pass').value = '';
    } else {
      showToast(result.message || 'Şifre değiştirilemedi.', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası.', 'error');
  }
}

// 10. Yedek Geri Yükleme
async function restoreBackupFile() {
  const fileInput = document.getElementById('backup-file-input');
  if (!fileInput.files || !fileInput.files[0]) {
    showToast('Lütfen geri yüklenecek JSON dosyasını seçin.', 'error');
    return;
  }

  if (!confirm('Yedek dosyasını geri yüklemek üzeresiniz. Mevcut tüm veriler bu yedekle değiştirilecek. Onaylıyor musunuz?')) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      const result = await res.json();
      if (result.success) {
        showToast('Yedek başarıyla geri yüklendi!', 'success');
        await fetchAdminData();
      } else {
        showToast(result.message || 'Geri yükleme başarısız.', 'error');
      }
    } catch (err) {
      showToast('Geçersiz JSON dosyası formatı!', 'error');
    }
  };
  reader.readAsText(fileInput.files[0]);
}
