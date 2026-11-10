// Yazdırılabilir CV JS Scripti
async function loadPrintCvData() {
  try {
    const res = await fetch('/api/cv');
    const result = await res.json();
    if (!result.success || !result.data) return;

    const data = result.data;
    const p = data.profile || {};
    const a = data.about || {};
    const expList = data.experiences || [];
    const eduList = data.educations || [];
    const skillList = data.skills || [];
    const projList = data.projects || [];

    // Başlık ve İsim
    document.getElementById('cv-title').innerText = `${p.name || 'Özgeçmiş'} - CV`;
    document.getElementById('cv-name').innerText = p.name || '';
    document.getElementById('cv-job-title').innerText = p.title || '';
    document.getElementById('cv-short-bio').innerText = p.bio || '';

    // İletişim
    document.getElementById('cv-email').innerText = p.email || '';
    document.getElementById('cv-phone').innerText = p.phone || '';
    document.getElementById('cv-location').innerText = p.location || '';
    const website = p.social?.linkedin || p.social?.github || p.social?.website || '';
    if (website) {
      document.getElementById('cv-website').innerText = website.replace(/^https?:\/\//, '');
    } else {
      document.getElementById('cv-website-row')?.remove();
    }

    // Hakkımda Özeti
    const aboutText = (a.intro ? a.intro + ' ' : '') + ((a.paragraphs && a.paragraphs[0]) ? a.paragraphs[0] : '');
    document.getElementById('cv-about-text').innerText = aboutText;

    // Deneyimler
    const expContainer = document.getElementById('cv-experiences');
    expContainer.innerHTML = '';
    expList.forEach(exp => {
      const div = document.createElement('div');
      div.className = 'space-y-1';

      const achievements = (exp.achievements || []).map(ach => 
        `<li class="text-[11px] text-slate-600 flex items-start gap-1.5"><span class="text-blue-500">•</span><span>${escapeHtml(ach)}</span></li>`
      ).join('');

      div.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate-900">${escapeHtml(exp.title)}</span>
          <span class="font-semibold text-slate-500 text-[11px]">${escapeHtml(exp.startDate)} — ${exp.current ? 'Günümüz' : escapeHtml(exp.endDate)}</span>
        </div>
        <div class="text-[11px] font-semibold text-blue-600">${escapeHtml(exp.company)} ${exp.location ? `• ${escapeHtml(exp.location)}` : ''}</div>
        <p class="text-[11px] text-slate-600 leading-relaxed">${escapeHtml(exp.description)}</p>
        ${achievements ? `<ul class="space-y-0.5 pt-0.5">${achievements}</ul>` : ''}
      `;
      expContainer.appendChild(div);
    });

    // Projeler
    const projContainer = document.getElementById('cv-projects');
    projContainer.innerHTML = '';
    projList.slice(0, 4).forEach(proj => {
      const div = document.createElement('div');
      div.className = 'p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1';
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-900">${escapeHtml(proj.title)}</span>
          <span class="text-[10px] uppercase font-semibold text-blue-600">${escapeHtml(proj.category)}</span>
        </div>
        <p class="text-[11px] text-slate-600 line-clamp-2">${escapeHtml(proj.summary || proj.description)}</p>
        <div class="text-[10px] text-slate-500 font-mono pt-1">${(proj.tags || []).slice(0, 4).join(' • ')}</div>
      `;
      projContainer.appendChild(div);
    });

    // Eğitim
    const eduContainer = document.getElementById('cv-educations');
    eduContainer.innerHTML = '';
    eduList.forEach(edu => {
      const div = document.createElement('div');
      div.className = 'text-xs';
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900">${escapeHtml(edu.degree)}</span>
          <span class="text-[11px] text-slate-500">${escapeHtml(edu.startDate)} — ${escapeHtml(edu.endDate)}</span>
        </div>
        <div class="text-[11px] text-slate-600">${escapeHtml(edu.school)}</div>
        ${edu.description ? `<p class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(edu.description)}</p>` : ''}
      `;
      eduContainer.appendChild(div);
    });

    // Yetenekler
    const skillContainer = document.getElementById('cv-skills');
    skillContainer.innerHTML = '';
    skillList.forEach(s => {
      const span = document.createElement('span');
      span.className = 'px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium';
      span.innerText = s.name;
      skillContainer.appendChild(span);
    });

    lucide.createIcons();
  } catch (err) {
    console.error('Yazdırılabilir CV yüklenirken hata:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', loadPrintCvData);
