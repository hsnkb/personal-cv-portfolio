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
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons({ root: toast });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.75rem)';
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

// Canlı Saat (Ankara GMT+3)
function updateClock() {
  const el = document.getElementById('nav-clock');
  if (!el) return;
  try {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit'
    });
    const loc = (cvData?.profile?.location || 'ANKARA').split(',')[0].trim().toUpperCase();
    el.innerText = `${loc} · ${timeStr}`;
  } catch (e) {
    el.innerText = 'TR · GMT+3';
  }
}

// Tema Değiştirici (Light / Dark)
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
      html.classList.remove('dark');
      localStorage.setItem('portfolio_theme_v2', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('portfolio_theme_v2', 'dark');
    }
  });
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
  updateClock();

  lucide.createIcons();
}

// 1. Profil ve Hero Render
function renderProfile() {
  const p = cvData.profile || {};

  document.getElementById('page-title').innerText = `${p.name || 'Portfolyo'} — ${p.title || 'CV'}`;
  document.getElementById('nav-name').innerText = p.name || 'Ad Soyad';
  document.getElementById('nav-title').innerText = (p.title || '').split('|')[0].trim();
  document.getElementById('hero-name').innerText = p.name || 'Ad Soyad';
  document.getElementById('hero-title').innerText = (p.title || '').replace(/\|/g, '·');
  document.getElementById('hero-bio').innerText = p.bio || '';
  document.getElementById('hero-status').innerText = p.status || 'Aktif';
  document.getElementById('hero-location').innerText = p.location || 'Türkiye';
  document.getElementById('hero-email').innerText = p.email || '';
  const emailAnchor = document.getElementById('hero-email-anchor');
  if (emailAnchor && p.email) emailAnchor.href = `mailto:${p.email}`;

  document.getElementById('hero-card-name').innerText = p.name || '';
  document.getElementById('hero-card-role').innerText = (p.title || '').split('|')[0].trim();
  document.getElementById('footer-name').innerText = p.name || '';
  document.getElementById('footer-year').innerText = new Date().getFullYear();

  // Baş Harfler (Initials)
  let initials = 'HK';
  if (p.name) {
    const parts = p.name.split(' ').filter(Boolean);
    initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    document.getElementById('nav-initials').innerText = initials;
  }

  // Avatar (Ferah kurumsal mavi monogram veya yüklenen fotoğraf)
  if (p.avatar) {
    let avatarUrl = p.avatar;
    if (avatarUrl.includes('ui-avatars.com')) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=512&background=2563eb&color=ffffff&bold=true&font-size=0.36`;
    }
    document.getElementById('hero-avatar').src = avatarUrl;
  }

  // İstatistikler
  const stats = p.stats || {};
  document.getElementById('stat-years').innerText = (stats.yearsExperience || '5') + (String(stats.yearsExperience).includes('+') ? '' : '+');
  document.getElementById('stat-projects').innerText = (stats.completedProjects || '15') + (String(stats.completedProjects).includes('+') ? '' : '+');
  document.getElementById('stat-clients').innerText = (stats.happyClients || '10') + (String(stats.happyClients).includes('+') ? '' : '+');

  // Sosyal Medya Bağlantıları (Editoryal Stil)
  const socialsContainer = document.getElementById('hero-socials');
  socialsContainer.innerHTML = '';
  const s = p.social || {};

  const socialLinks = [
    { key: 'github', icon: 'github', label: 'GitHub', url: s.github },
    { key: 'linkedin', icon: 'linkedin', label: 'LinkedIn', url: s.linkedin },
    { key: 'twitter', icon: 'twitter', label: 'X', url: s.twitter },
    { key: 'website', icon: 'globe', label: 'Web', url: s.website },
    { key: 'medium', icon: 'book-open', label: 'Medium', url: s.medium }
  ];

  socialLinks.forEach(item => {
    if (item.url && item.url.trim()) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-card surface-card-interactive text-[11px] font-mono text-zinc-600 dark:text-zinc-300';
      a.title = item.label;
      a.innerHTML = `
        <i data-lucide="${item.icon}" class="w-3 h-3"></i>
        <span>${item.label}</span>
        <span class="text-zinc-400">↗</span>
      `;
      socialsContainer.appendChild(a);
    }
  });
}

// 2. Hakkımda Bölümü (Asimetrik Editoryal Yapı)
function renderAbout() {
  const about = cvData.about || {};
  const contentContainer = document.getElementById('about-content');
  const highlightsContainer = document.getElementById('about-highlights');

  contentContainer.innerHTML = '';
  highlightsContainer.innerHTML = '';

  if (about.intro) {
    const introP = document.createElement('p');
    introP.className = 'text-lg sm:text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug';
    introP.innerText = about.intro;
    contentContainer.appendChild(introP);
  }

  if (Array.isArray(about.paragraphs)) {
    about.paragraphs.forEach(pText => {
      const p = document.createElement('p');
      p.className = 'text-zinc-600 dark:text-zinc-400 leading-relaxed';
      p.innerText = pText;
      contentContainer.appendChild(p);
    });
  }

  if (Array.isArray(about.highlights)) {
    about.highlights.forEach((hText, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const li = document.createElement('li');
      li.className = 'surface-card rounded-lg p-4 flex items-start gap-3.5';
      li.innerHTML = `
        <span class="font-mono text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 pt-0.5 shrink-0">${num}</span>
        <span class="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">${escapeHtml(hText)}</span>
      `;
      highlightsContainer.appendChild(li);
    });
  }
}

// 3. Deneyimler Bölümü (Editorial Career Ledger)
function renderExperiences() {
  const container = document.getElementById('experience-list');
  const experiences = cvData.experiences || [];
  container.innerHTML = '';

  document.getElementById('exp-count').innerText = `${experiences.length} Pozisyon`;

  if (experiences.length === 0) {
    container.innerHTML = '<p class="text-sm text-zinc-500">Henüz deneyim eklenmedi.</p>';
    return;
  }

  experiences.forEach((exp, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const el = document.createElement('div');
    el.className = 'surface-card rounded-xl p-6 sm:p-7 transition';

    const techTags = (exp.technologies || []).map(t =>
      `<span class="px-2.5 py-1 text-[11px] font-mono rounded-md hairline-border text-zinc-600 dark:text-zinc-300 bg-zinc-500/5">${escapeHtml(t)}</span>`
    ).join('');

    const achievementsList = (exp.achievements || []).map(a =>
      `<li class="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5 leading-relaxed">
        <span class="text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">—</span>
        <span>${escapeHtml(a)}</span>
       </li>`
    ).join('');

    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Sol Kolon: Tarih, Şirket & Lokasyon (4 Kolon) -->
        <div class="lg:col-span-4 space-y-2 lg:pr-4 lg:border-r border-zinc-200 dark:border-zinc-800/80">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-zinc-400">${num} /</span>
            <span class="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              ${escapeHtml(exp.startDate)} — ${exp.current ? 'Günümüz' : escapeHtml(exp.endDate)}
            </span>
            ${exp.current ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">AKTİF</span>' : ''}
          </div>
          <div class="text-base font-semibold tracking-tight">${escapeHtml(exp.company)}</div>
          ${exp.location ? `
            <div class="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <i data-lucide="map-pin" class="w-3 h-3"></i>
              <span>${escapeHtml(exp.location)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Sağ Kolon: Unvan, Açıklama, Başarılar & Teknolojiler (8 Kolon) -->
        <div class="lg:col-span-8 space-y-4">
          <h4 class="text-lg font-semibold tracking-tight">${escapeHtml(exp.title)}</h4>
          
          ${exp.description ? `
            <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              ${escapeHtml(exp.description)}
            </p>
          ` : ''}

          ${achievementsList ? `<ul class="space-y-2 pt-1">${achievementsList}</ul>` : ''}

          ${techTags ? `<div class="flex flex-wrap gap-1.5 pt-4 hairline-t">${techTags}</div>` : ''}
        </div>

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
    container.innerHTML = '<p class="text-sm text-zinc-500">Henüz eğitim bilgisi eklenmedi.</p>';
    return;
  }

  educations.forEach(edu => {
    const el = document.createElement('div');
    el.className = 'surface-card rounded-xl p-5 flex flex-col justify-between space-y-3';
    el.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] text-zinc-400">${escapeHtml(edu.startDate)} — ${escapeHtml(edu.endDate)}</span>
          <i data-lucide="graduation-cap" class="w-4 h-4 text-zinc-400"></i>
        </div>
        <h4 class="text-sm font-semibold tracking-tight">${escapeHtml(edu.degree)}</h4>
        <div class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">${escapeHtml(edu.school)}</div>
      </div>
      ${edu.description ? `<p class="text-xs text-zinc-500 dark:text-zinc-400 pt-2 hairline-t leading-relaxed">${escapeHtml(edu.description)}</p>` : ''}
    `;
    container.appendChild(el);
  });
}

// 5. Yetenekler Bölümü (Hardware Specification Matrix — Yüzde barı yerine mimari sinyal göstergesi)
function renderSkills() {
  const grid = document.getElementById('skills-grid');
  const catContainer = document.getElementById('skill-categories');
  const skills = cvData.skills || [];

  const categories = ['all', ...new Set(skills.map(s => s.category).filter(Boolean))];

  catContainer.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    const isSelected = (currentSkillCategory === cat);
    btn.className = `filter-tab px-3 py-1.5 rounded-md text-xs font-mono ${isSelected ? 'active' : ''}`;
    btn.innerText = cat === 'all' ? 'Tümü' : cat;
    btn.onclick = () => {
      currentSkillCategory = cat;
      renderSkills();
      lucide.createIcons();
    };
    catContainer.appendChild(btn);
  });

  const filteredSkills = currentSkillCategory === 'all'
    ? skills
    : skills.filter(s => s.category === currentSkillCategory);

  grid.innerHTML = '';

  if (filteredSkills.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-8 text-zinc-500 text-xs font-mono">Bu kategoride kayıt bulunmuyor.</div>';
    return;
  }

  filteredSkills.forEach(s => {
    const lvl = Number(s.level) || 85;
    // 5 segmentli sinyal hesabı
    const activeSegments = Math.max(1, Math.min(5, Math.round(lvl / 20)));
    const tierLabel = lvl >= 90 ? 'Kıdemli / Uzman' : (lvl >= 80 ? 'İleri Seviye' : 'Yetkin');

    let segmentsHtml = '';
    for (let i = 1; i <= 5; i++) {
      segmentsHtml += `<span class="signal-dot ${i <= activeSegments ? 'active' : ''}"></span>`;
    }

    const card = document.createElement('div');
    card.className = 'surface-card surface-card-interactive rounded-xl p-4 flex flex-col justify-between space-y-4';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate max-w-[140px]">${escapeHtml(s.category || 'Genel')}</span>
        <div class="flex items-center gap-1" title="${tierLabel}">
          ${segmentsHtml}
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg hairline-border flex items-center justify-center text-zinc-500 dark:text-zinc-300 shrink-0">
          <i data-lucide="${escapeHtml(s.icon || 'code')}" class="w-4 h-4"></i>
        </div>
        <div class="min-w-0">
          <div class="text-xs sm:text-sm font-semibold tracking-tight truncate">${escapeHtml(s.name)}</div>
          <div class="text-[11px] font-mono text-zinc-400">${tierLabel}</div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 6. Projeler Bölümü (Curated Case Studies)
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const catContainer = document.getElementById('project-categories');
  const projects = cvData.projects || [];

  const categories = ['all', ...new Set(projects.map(p => p.category).filter(Boolean))];

  catContainer.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    const isSelected = (currentProjectCategory === cat);
    btn.className = `filter-tab px-3 py-1.5 rounded-md text-xs font-mono ${isSelected ? 'active' : ''}`;
    btn.innerText = cat === 'all' ? 'Tümü' : cat;
    btn.onclick = () => {
      currentProjectCategory = cat;
      renderProjects();
      lucide.createIcons();
    };
    catContainer.appendChild(btn);
  });

  const filteredProjects = currentProjectCategory === 'all'
    ? projects
    : projects.filter(p => p.category === currentProjectCategory);

  grid.innerHTML = '';

  if (filteredProjects.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-zinc-500 text-xs font-mono">Bu kategoride henüz proje bulunmuyor.</div>';
    return;
  }

  filteredProjects.forEach((proj, idx) => {
    const indexStr = String(idx + 1).padStart(2, '0');
    const card = document.createElement('div');
    card.className = 'surface-card surface-card-interactive rounded-xl p-5 sm:p-6 group cursor-pointer';
    card.onclick = (e) => {
      if (e.target.closest('a')) return;
      openProjectModal(proj.id);
    };

    const tagsHtml = (proj.tags || []).slice(0, 6).map(t =>
      `<span class="px-2.5 py-1 text-[11px] font-mono rounded-md hairline-border text-zinc-600 dark:text-zinc-300 bg-zinc-500/5">${escapeHtml(t)}</span>`
    ).join('');

    const highlightsHtml = (proj.highlights || []).slice(0, 3).map(h =>
      `<li class="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2 leading-relaxed">
        <span class="font-mono text-zinc-400 mt-0.5">—</span>
        <span>${escapeHtml(h)}</span>
      </li>`
    ).join('');

    card.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Üst Meta Bar ve Proje Başlığı (Fotoğrafın Üstünde) -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-2 hairline-b">
            <span>PRJ // ${indexStr}</span>
            <div class="flex items-center gap-2">
              <span>${escapeHtml(proj.category)}</span>
              ${proj.featured ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Öne Çıkan</span>' : ''}
            </div>
          </div>

          <div class="flex items-start justify-between gap-2 pt-0.5">
            <h4 class="text-lg sm:text-xl font-semibold tracking-tight leading-snug group-hover:underline decoration-zinc-400 underline-offset-4">${escapeHtml(proj.title)}</h4>
            <i data-lucide="arrow-up-right" class="w-4 h-4 text-zinc-400 shrink-0 mt-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition"></i>
          </div>
        </div>

        <!-- Tam Genişlik Kenarlıklı Görsel Çerçevesi -->
        <div class="w-full p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-sm">
          <div class="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex items-center justify-center">
            <img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}" class="w-full max-h-[460px] object-contain group-hover:scale-[1.01] transition duration-500">
          </div>
        </div>

        <!-- Alt Kısım: Açıklama, Maddeler, Etiketler ve Bağlantılar (Fotoğrafın Altında) -->
        <div class="space-y-4 pt-1">
          <div class="space-y-2">
            <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">${escapeHtml(proj.summary || proj.description)}</p>

            ${highlightsHtml ? `<ul class="space-y-1.5 pt-1">${highlightsHtml}</ul>` : ''}
          </div>

          ${tagsHtml ? `<div class="flex flex-wrap gap-1.5">${tagsHtml}</div>` : ''}

          <div class="pt-3 hairline-t flex items-center justify-between text-xs">
            <span class="font-mono text-[11px] text-zinc-500 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition">
              Vaka Detayı →
            </span>

            <div class="flex items-center gap-2">
              ${proj.githubUrl ? `
                <a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md btn-editorial-secondary text-[11px] font-mono" title="Kaynak Kod (GitHub)">
                  <i data-lucide="github" class="w-3.5 h-3.5"></i>
                  <span>GitHub</span>
                </a>
              ` : ''}
              ${proj.demoUrl ? `
                <a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md btn-editorial-secondary text-[11px] font-mono" title="Canlı Önizleme">
                  <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                  <span>Demo</span>
                </a>
              ` : ''}
            </div>
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
    `<li class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5 leading-relaxed">
      <span class="font-mono text-zinc-400 mt-0.5">—</span>
      <span>${escapeHtml(h)}</span>
    </li>`
  ).join('');

  const tagsList = (proj.tags || []).map(t =>
    `<span class="px-2.5 py-1 text-xs font-mono rounded-md hairline-border text-zinc-600 dark:text-zinc-300">${escapeHtml(t)}</span>`
  ).join('');

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <span>PROJE İNCELEMESİ</span>
        <span>/</span>
        <span class="uppercase">${escapeHtml(proj.category)}</span>
      </div>

      <div>
        <h3 class="text-xl sm:text-2xl font-semibold tracking-tight mb-2">${escapeHtml(proj.title)}</h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">${escapeHtml(proj.summary)}</p>
      </div>

      <div class="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
        <div class="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900">
          <img src="${escapeHtml(proj.image)}" alt="${escapeHtml(proj.title)}" class="w-full max-h-[400px] object-contain mx-auto">
        </div>
      </div>

      ${proj.description ? `
        <div class="space-y-2">
          <h4 class="text-[11px] font-mono uppercase tracking-wider text-zinc-400">MİMARİ &amp; KAPSAM</h4>
          <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">${escapeHtml(proj.description)}</p>
        </div>
      ` : ''}

      ${highlightsList ? `
        <div class="space-y-2.5 pt-4 hairline-t">
          <h4 class="text-[11px] font-mono uppercase tracking-wider text-zinc-400">ÖNE ÇIKAN ÖZELLİKLER &amp; ÇÖZÜMLER</h4>
          <ul class="space-y-2">${highlightsList}</ul>
        </div>
      ` : ''}

      <div class="space-y-2.5 pt-4 hairline-t">
        <h4 class="text-[11px] font-mono uppercase tracking-wider text-zinc-400">TEKNOLOJİ YIĞINI</h4>
        <div class="flex flex-wrap gap-1.5">${tagsList}</div>
      </div>

      ${(proj.demoUrl || proj.githubUrl) ? `
        <div class="pt-4 hairline-t flex flex-wrap items-center gap-3">
          ${proj.demoUrl ? `
            <a href="${escapeHtml(proj.demoUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs btn-editorial-primary">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
              <span>Canlı Uygulamayı Aç</span>
            </a>
          ` : ''}
          ${proj.githubUrl ? `
            <a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs btn-editorial-secondary">
              <i data-lucide="github" class="w-3.5 h-3.5"></i>
              <span>GitHub Deposu</span>
            </a>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;

  modal.classList.remove('hidden');
  lucide.createIcons({ root: content });
}

// 7. İletişim Bilgileri
function renderContact() {
  const p = cvData.profile || {};
  document.getElementById('contact-email-val').innerText = p.email || '';
  document.getElementById('contact-email-link').href = `mailto:${p.email || ''}`;

  document.getElementById('contact-phone-val').innerText = p.phone || '';
  document.getElementById('contact-phone-link').href = `tel:${(p.phone || '').replace(/[^0-9+]/g, '')}`;

  document.getElementById('contact-location-val').innerText = p.location || 'Türkiye';

  const contSocials = document.getElementById('contact-socials');
  contSocials.innerHTML = '';
  const s = p.social || {};

  const links = [
    { key: 'github', label: 'GitHub', icon: 'github', url: s.github },
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin', url: s.linkedin },
    { key: 'twitter', label: 'X / Twitter', icon: 'twitter', url: s.twitter },
    { key: 'website', label: 'Web', icon: 'globe', url: s.website },
    { key: 'medium', label: 'Medium', icon: 'book-open', url: s.medium }
  ];

  links.forEach(item => {
    if (item.url && item.url.trim()) {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md btn-editorial-secondary text-xs font-mono';
      a.innerHTML = `<i data-lucide="${item.icon}" class="w-3.5 h-3.5"></i><span>${item.label}</span><span class="text-zinc-400">↗</span>`;
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
  submitBtn.innerHTML = `<span>Gönderiliyor...</span>`;

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
  setupThemeToggle();
  updateClock();
  setInterval(updateClock, 30000);
  fetchCvData();
});
