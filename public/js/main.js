// Global Veri Havuzu
let cvData = null;
let currentSkillCategory = 'all';
let currentProjectCategory = 'all';

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

// Verileri API'den Çekme
async function fetchCvData() {
  try {
    const res = await fetch('/api/cv');
    const result = await res.json();
    if (result.success && result.data) {
      cvData = result.data;
      renderAll();
    } else {
      showToast('Veriler yüklenirken hata oluştu.', 'error');
    }
  } catch (err) {
    console.error('Veri çekilemedi:', err);
    showToast('Sunucu ile bağlantı kurulamadı.', 'error');
  }
}

// Tüm Sayfayı Render Etme
function renderAll() {
  if (!cvData) return;

  renderProfile();
  renderAbout();
  renderExperiences();
  renderEducations();
  renderSkills();
  renderProjects();
  renderContact();

  // Lucide ikonlarını yeniden tara
  lucide.createIcons();
}

// 1. Profil ve Hero Render
function renderProfile() {
  const p = cvData.profile || {};
  
  // Başlık ve İsimler
  document.getElementById('page-title').innerText = `${p.name || 'Portfolyo'} | ${p.title || 'CV'}`;
  document.getElementById('nav-name').innerText = p.name || 'Ad Soyad';
  document.getElementById('nav-title').innerText = p.title || '';
  document.getElementById('hero-name').innerText = p.name || 'Ad Soyad';
  document.getElementById('hero-title').innerText = p.title || '';
  document.getElementById('hero-bio').innerText = p.bio || '';
  document.getElementById('hero-status').innerText = p.status || 'Aktif';
  document.getElementById('hero-location').innerText = p.location || 'Türkiye';
  document.getElementById('hero-email').innerText = p.email || '';
  document.getElementById('hero-card-name').innerText = p.name || '';
  document.getElementById('hero-card-role').innerText = p.title || '';
  document.getElementById('footer-name').innerText = p.name || '';
  document.getElementById('footer-year').innerText = new Date().getFullYear();

  // Baş Harfler (Initials)
  if (p.name) {
    const parts = p.name.split(' ').filter(Boolean);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    document.getElementById('nav-initials').innerText = initials;
  }

  // Avatar
  if (p.avatar) {
    document.getElementById('hero-avatar').src = p.avatar;
  }

  // İstatistikler
  const stats = p.stats || {};
  document.getElementById('stat-years').innerText = (stats.yearsExperience || '5+') + (String(stats.yearsExperience).includes('+') ? '' : '+');
  document.getElementById('stat-projects').innerText = (stats.completedProjects || '25+') + (String(stats.completedProjects).includes('+') ? '' : '+');
  document.getElementById('stat-clients').innerText = (stats.happyClients || '15+') + (String(stats.happyClients).includes('+') ? '' : '+');

  // Sosyal Medya İkonları
  const socialsContainer = document.getElementById('hero-socials');
  socialsContainer.innerHTML = '';
  const s = p.social || {};

  const socialLinks = [
    { key: 'github', icon: 'github', label: 'GitHub', url: s.github },
    { key: 'linkedin', icon: 'linkedin', label: 'LinkedIn', url: s.linkedin },
    { key: 'twitter', icon: 'twitter', label: 'Twitter / X', url: s.twitter },
    { key: 'website', icon: 'globe', label: 'Web Sitesi', url: s.website },
    { key: 'medium', icon: 'book-open', label: 'Medium', url: s.medium }
  ];

  socialLinks.forEach(item => {
    if (item.url && item.url.trim()) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-brand-600 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition transform hover:-translate-y-1';
      a.title = item.label;
      a.innerHTML = `<i data-lucide="${item.icon}" class="w-4 h-4"></i>`;
      socialsContainer.appendChild(a);
    }
  });
}

// 2. Hakkımda Bölümü
function renderAbout() {
  const about = cvData.about || {};
  const contentContainer = document.getElementById('about-content');
  const highlightsContainer = document.getElementById('about-highlights');

  contentContainer.innerHTML = '';
  highlightsContainer.innerHTML = '';

  if (about.intro) {
    const introP = document.createElement('p');
    introP.className = 'text-lg font-medium text-white';
    introP.innerText = about.intro;
    contentContainer.appendChild(introP);
  }

  if (Array.isArray(about.paragraphs)) {
    about.paragraphs.forEach(pText => {
      const p = document.createElement('p');
      p.className = 'text-slate-300';
      p.innerText = pText;
      contentContainer.appendChild(p);
    });
  }

  if (Array.isArray(about.highlights)) {
    about.highlights.forEach(hText => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3 text-sm text-slate-300';
      li.innerHTML = `
        <div class="w-5 h-5 rounded-md bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
        </div>
        <span>${escapeHtml(hText)}</span>
      `;
      highlightsContainer.appendChild(li);
    });
  }
}

// 3. Deneyimler Bölümü
function renderExperiences() {
  const container = document.getElementById('experience-list');
  const experiences = cvData.experiences || [];
  container.innerHTML = '';

  document.getElementById('exp-count').innerText = `${experiences.length} Pozisyon`;

  if (experiences.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-500">Henüz deneyim eklenmedi.</p>';
    return;
  }

  experiences.forEach(exp => {
    const el = document.createElement('div');
    el.className = 'timeline-item';

    const techTags = (exp.technologies || []).map(t => 
      `<span class="px-2 py-0.5 text-xs rounded-md bg-white/5 text-slate-300 border border-white/5">${escapeHtml(t)}</span>`
    ).join(' ');

    const achievementsList = (exp.achievements || []).map(a => 
      `<li class="text-xs text-slate-300 flex items-start gap-2">
        <span class="text-brand-400 mt-1">•</span>
        <span>${escapeHtml(a)}</span>
       </li>`
    ).join('');

    el.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="glass-card rounded-2xl p-5 sm:p-6 mb-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <h4 class="text-base font-bold text-white">${escapeHtml(exp.title)}</h4>
          <span class="text-xs font-semibold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20 shrink-0 w-fit">
            ${escapeHtml(exp.startDate)} — ${exp.current ? 'Günümüz' : escapeHtml(exp.endDate)}
          </span>
        </div>

        <div class="text-xs font-medium text-slate-400 mb-3 flex items-center gap-2">
          <span class="text-slate-200">${escapeHtml(exp.company)}</span>
          ${exp.location ? `<span>•</span> <span>${escapeHtml(exp.location)}</span>` : ''}
        </div>

        <p class="text-xs sm:text-sm text-slate-300 mb-3 leading-relaxed">
          ${escapeHtml(exp.description)}
        </p>

        ${achievementsList ? `<ul class="space-y-1.5 mb-4 pl-1">${achievementsList}</ul>` : ''}

        ${techTags ? `<div class="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">${techTags}</div>` : ''}
      </div>
    `;

    container.appendChild(el);
  });
}

// 4. Eğitim Bölümü
function renderEducations() {
  const container = document.getElementById('education-list');
  const educations = cvData.educations || [];
  container.innerHTML = '';

  if (educations.length === 0) {
    container.innerHTML = '<p class="text-sm text-slate-500">Henüz eğitim bilgisi eklenmedi.</p>';
    return;
  }

  educations.forEach(edu => {
    const el = document.createElement('div');
    el.className = 'glass-card rounded-2xl p-5';
    el.innerHTML = `
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="text-sm font-bold text-white">${escapeHtml(edu.degree)}</h4>
        <span class="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
          ${escapeHtml(edu.startDate)} — ${escapeHtml(edu.endDate)}
        </span>
      </div>
      <div class="text-xs font-medium text-slate-300 mb-2">${escapeHtml(edu.school)}</div>
      ${edu.description ? `<p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(edu.description)}</p>` : ''}
    `;
    container.appendChild(el);
  });
}

// 5. Yetenekler Bölümü
function renderSkills() {
  const grid = document.getElementById('skills-grid');
  const catContainer = document.getElementById('skill-categories');
  const skills = cvData.skills || [];

  // Kategorileri topla
  const categories = ['all', ...new Set(skills.map(s => s.category).filter(Boolean))];

  // Kategori Butonları
  catContainer.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    const isSelected = (currentSkillCategory === cat);
    btn.className = `skill-filter-btn px-4 py-2 rounded-xl text-xs font-semibold transition ${
      isSelected 
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
        : 'bg-white/5 text-slate-300 hover:bg-white/10'
    }`;
    btn.innerText = cat === 'all' ? 'Tümü' : cat;
    btn.onclick = () => {
      currentSkillCategory = cat;
      renderSkills();
    };
    catContainer.appendChild(btn);
  });

  // Filtrelenmiş Yetenekler
  const filteredSkills = currentSkillCategory === 'all'
    ? skills
    : skills.filter(s => s.category === currentSkillCategory);

  grid.innerHTML = '';

  if (filteredSkills.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-6 text-slate-500 text-sm">Bu kategoride yetenek bulunmuyor.</div>';
    return;
  }

  filteredSkills.forEach(s => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-4 flex flex-col justify-between group';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center group-hover:scale-110 transition">
          <i data-lucide="${escapeHtml(s.icon || 'code')}" class="w-4 h-4"></i>
        </div>
        <span class="text-xs font-mono font-bold text-slate-400">${s.level}%</span>
      </div>
      <div>
        <div class="text-sm font-semibold text-white mb-1">${escapeHtml(s.name)}</div>
        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-2">${escapeHtml(s.category || 'Genel')}</div>
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-700" style="width: ${s.level}%"></div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 6. Projeler Bölümü
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const catContainer = document.getElementById('project-categories');
  const projects = cvData.projects || [];

  // Kategoriler
  const categories = ['all', ...new Set(projects.map(p => p.category).filter(Boolean))];

  catContainer.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    const isSelected = (currentProjectCategory === cat);
    btn.className = `project-filter-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
      isSelected 
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
        : 'bg-white/5 text-slate-300 hover:bg-white/10'
    }`;
    btn.innerText = cat === 'all' ? 'Tümü' : cat;
    btn.onclick = () => {
      currentProjectCategory = cat;
      renderProjects();
    };
    catContainer.appendChild(btn);
  });

  const filteredProjects = currentProjectCategory === 'all'
    ? projects
    : projects.filter(p => p.category === currentProjectCategory);

  grid.innerHTML = '';

  if (filteredProjects.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500 text-sm">Bu kategoride henüz proje eklenmedi.</div>';
    return;
  }

  filteredProjects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl overflow-hidden flex flex-col group';

    const tagsHtml = (proj.tags || []).slice(0, 4).map(t => 
      `<span class="px-2 py-0.5 text-[11px] rounded bg-white/5 text-slate-300 border border-white/5">${escapeHtml(t)}</span>`
    ).join('');

    card.innerHTML = `
      <div class="h-48 overflow-hidden relative bg-slate-800">
        <img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
        <div class="absolute top-3 left-3">
          <span class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-slate-900/90 text-brand-400 border border-white/10 backdrop-blur-md">
            ${escapeHtml(proj.category)}
          </span>
        </div>
        ${proj.featured ? `
          <div class="absolute top-3 right-3">
            <span class="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
              <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i> Öne Çıkan
            </span>
          </div>
        ` : ''}
      </div>

      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 class="text-base font-bold text-white mb-2 group-hover:text-brand-400 transition">${escapeHtml(proj.title)}</h4>
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">${escapeHtml(proj.summary || proj.description)}</p>
          <div class="flex flex-wrap gap-1.5 mb-5">${tagsHtml}</div>
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between">
          <button onclick="openProjectModal('${proj.id}')" class="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <span>Detayları Gör</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>

          <div class="flex items-center gap-2">
            ${proj.githubUrl ? `
              <a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition" title="GitHub Deposu">
                <i data-lucide="github" class="w-4 h-4"></i>
              </a>
            ` : ''}
            ${proj.demoUrl ? `
              <a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener" class="p-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition" title="Canlı Önizleme">
                <i data-lucide="external-link" class="w-4 h-4"></i>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Proje Detay Modalı
function openProjectModal(projectId) {
  const proj = (cvData.projects || []).find(p => p.id === projectId);
  if (!proj) return;

  const modal = document.getElementById('project-modal');
  const content = document.getElementById('project-modal-content');

  const highlightsList = (proj.highlights || []).map(h => 
    `<li class="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
      <span>${escapeHtml(h)}</span>
    </li>`
  ).join('');

  const tagsList = (proj.tags || []).map(t => 
    `<span class="px-2.5 py-1 text-xs rounded-lg bg-white/5 text-slate-300 border border-white/10">${escapeHtml(t)}</span>`
  ).join('');

  content.innerHTML = `
    <div class="space-y-6">
      <div class="h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 relative">
        <img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span class="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg bg-brand-600 text-white">
            ${escapeHtml(proj.category)}
          </span>
          <div class="flex items-center gap-2">
            ${proj.demoUrl ? `
              <a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow transition">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Canlı Demo
              </a>
            ` : ''}
            ${proj.githubUrl ? `
              <a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 text-white border border-white/20 hover:bg-white/10 transition">
                <i data-lucide="github" class="w-3.5 h-3.5"></i> GitHub
              </a>
            ` : ''}
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-2xl font-bold text-white mb-2">${escapeHtml(proj.title)}</h3>
        <p class="text-sm font-medium text-slate-300 mb-4">${escapeHtml(proj.summary)}</p>
        <p class="text-sm text-slate-400 leading-relaxed whitespace-pre-line">${escapeHtml(proj.description)}</p>
      </div>

      ${highlightsList ? `
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Önemli Özellikler & Çözümler</h4>
          <ul class="space-y-2 bg-slate-900/50 p-4 rounded-xl border border-white/5">${highlightsList}</ul>
        </div>
      ` : ''}

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Kullanılan Teknolojiler</h4>
        <div class="flex flex-wrap gap-2">${tagsList}</div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  lucide.createIcons({ root: content });
}

// 7. İletişim Bilgileri
function renderContact() {
  const p = cvData.profile || {};
  document.getElementById('contact-email-val').innerText = p.email || 'iletisim@ahmetyilmaz.dev';
  document.getElementById('contact-email-link').href = `mailto:${p.email || ''}`;

  document.getElementById('contact-phone-val').innerText = p.phone || '+90 (555) 123 45 67';
  document.getElementById('contact-phone-link').href = `tel:${(p.phone || '').replace(/[^0-9+]/g, '')}`;

  document.getElementById('contact-location-val').innerText = p.location || 'İstanbul, Türkiye';

  // Sosyal Medya İletişim
  const contSocials = document.getElementById('contact-socials');
  contSocials.innerHTML = '';
  const s = p.social || {};

  const links = [
    { key: 'github', icon: 'github', url: s.github },
    { key: 'linkedin', icon: 'linkedin', url: s.linkedin },
    { key: 'twitter', icon: 'twitter', url: s.twitter },
    { key: 'medium', icon: 'book-open', url: s.medium }
  ];

  links.forEach(item => {
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.className = 'w-9 h-9 rounded-xl bg-white/5 hover:bg-brand-600 flex items-center justify-center text-slate-300 hover:text-white transition';
      a.innerHTML = `<i data-lucide="${item.icon}" class="w-4 h-4"></i>`;
      contSocials.appendChild(a);
    }
  });
}

// İletişim Formu Gönderimi
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById('contact-submit-btn');
  const originalBtnHtml = submitBtn.innerHTML;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
    <span>Gönderiliyor...</span>
  `;

  const formData = new FormData(form);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Mesajınız başarıyla iletildi!', 'success');
      form.reset();
    } else {
      showToast(result.message || 'Mesaj gönderilemedi.', 'error');
    }
  } catch (err) {
    showToast('Sunucu ile bağlantı hatası oluştu.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    lucide.createIcons({ root: submitBtn });
  }
});

// Proje Modalı Kapatma
document.getElementById('close-project-modal')?.addEventListener('click', () => {
  document.getElementById('project-modal').classList.add('hidden');
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('project-modal');
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

// Mobil Menü Toggle
const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
    });
  });
}

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
  fetchCvData();
});
