/* ============================================================
   planning.js — Gestion du planning randonnées
   Envoi vers Apps Script via formulaire HTML invisible
   ============================================================ */

const BASE = 'https://dbizcyber.github.io/randoFDR/data/';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCloUqDhHjvf50e351lFIyMTjDLcutQ7Wt7p0XPPsbalmGOhQDj-4VXyrlS9L6S_lmvA/exec';

let planning = [];

/* ══ Iframe cachée pour recevoir la réponse du formulaire ══ */
(function() {
  var iframe = document.createElement('iframe');
  iframe.name = 'iframe_hidden';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
})();

/* ══ Envoi via formulaire HTML — contourne les restrictions CORS ══ */
function envoyerViaFormulaire(item, action) {
  return new Promise(function(resolve) {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'iframe_hidden';
    form.style.display = 'none';

    var fields = {
      action:    action          || 'add',
      date:      item.date      || '',
      animateur: item.animateur || '',
      nom:       item.nom       || '',
      ibp:       item.ibp       || '',
      distance:  item.distance  || '',
      denivele:  item.denivele  || ''
    };

    Object.keys(fields).forEach(function(key) {
      var input = document.createElement('input');
      input.type  = 'hidden';
      input.name  = key;
      input.value = fields[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(function() {
      document.body.removeChild(form);
      resolve();
    }, 2000);
  });
}

/* ══ INIT — charger les données JSON ══ */
async function init() {
  try {
    const [animateurs, randos] = await Promise.all([
      fetch(BASE + 'animateurs.json').then(r => r.json()),
      fetch(BASE + 'randos.json').then(r => r.json())
    ]);

    /* ── Remplir menu animateurs ── */
    const selAnim = document.getElementById('animateur');
    animateurs.filter(a => a.nom !== '').forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.nom;
      opt.textContent = a.nom;
      selAnim.appendChild(opt);
    });

    /* ── Autocomplétion randos ── */
    const inputRando = document.getElementById('rechercheRando');
    const sugDiv     = document.getElementById('suggestions');
    let nomSelectionne = '';
    let indexSugg = -1;

    inputRando.addEventListener('input', () => {
      const filtre = inputRando.value.toLowerCase().trim();
      sugDiv.innerHTML = '';
      nomSelectionne = '';
      if (!filtre) return;
      randos.filter(r => r.toLowerCase().includes(filtre)).slice(0, 10).forEach(r => {
        const div = document.createElement('div');
        div.className = 'suggestion';
        div.textContent = r;
        div.addEventListener('click', () => {
          inputRando.value = r;
          nomSelectionne = r;
          sugDiv.innerHTML = '';
        });
        sugDiv.appendChild(div);
      });
    });

    inputRando.addEventListener('keydown', e => {
      const items = sugDiv.querySelectorAll('.suggestion');
      if (!items.length) return;
      if (e.key === 'ArrowDown')  { e.preventDefault(); indexSugg = Math.min(indexSugg + 1, items.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); indexSugg = Math.max(indexSugg - 1, 0); }
      else if (e.key === 'Enter' && indexSugg >= 0) { e.preventDefault(); items[indexSugg].click(); indexSugg = -1; return; }
      items.forEach((s, i) => s.classList.toggle('highlight', i === indexSugg));
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) sugDiv.innerHTML = '';
    });

    /* ── Exposer ajouterRando ── */
    window.ajouterRando = function() {
      const date      = document.getElementById('dateRando').value;
      const animateur = document.getElementById('animateur').value;
      const nom       = nomSelectionne || inputRando.value.trim();
      const ibp       = document.getElementById('ibp').value;
      const distance  = document.getElementById('distance').value;
      const denivele  = document.getElementById('denivele').value;

      if (!date)      { toast('⚠️ Date manquante'); return; }
      if (!animateur) { toast('⚠️ Animateur manquant'); return; }
      if (!nom)       { toast('⚠️ Nom de la rando manquant'); return; }

      planning.push({ date, animateur, nom, ibp, distance, denivele });
      planning.sort((a, b) => a.date.localeCompare(b.date));

      document.getElementById('dateRando').value  = '';
      document.getElementById('animateur').value  = '';
      document.getElementById('ibp').value        = '';
      document.getElementById('distance').value   = '';
      document.getElementById('denivele').value   = '';
      inputRando.value = ''; nomSelectionne = '';
      document.getElementById('ibpBadge').className = 'ibp-badge';

      /* Date suivante automatique */
      const last = new Date(date + 'T12:00:00');
      const dow = last.getDay();
      const next = new Date(last);
      next.setDate(last.getDate() + (dow === 1 ? 3 : dow === 4 ? 4 : 3));
      document.getElementById('dateRando').value = next.toISOString().split('T')[0];

      renderPlanning();
      toast('✅ Randonnée ajoutée');
    };

  } catch(err) {
    console.error('[Planning] Erreur chargement données:', err);
    toast('❌ Erreur chargement données');
  }
}

/* ══ IBP badge ══ */
document.getElementById('ibp').addEventListener('input', function() {
  majBadgeIBP(this.value);
});

function majBadgeIBP(v) {
  const badge = document.getElementById('ibpBadge');
  const info = niveauIBP(v);
  if (!info) { badge.className = 'ibp-badge'; return; }
  badge.textContent = info.label;
  badge.style.background = info.bg;
  badge.style.color = info.color;
  badge.className = 'ibp-badge visible';
}

function niveauIBP(v) {
  const n = parseFloat(v);
  if (isNaN(n) || v === '') return null;
  if (n <= 25)  return { label: '🟢 N1 Facile',          bg: '#d4edda', color: '#155724' };
  if (n <= 50)  return { label: '🔵 N2 Assez Facile',    bg: '#cce5ff', color: '#004085' };
  if (n <= 75)  return { label: '🟡 N3 Peu Difficile',   bg: '#fff3cd', color: '#856404' };
  if (n <= 100) return { label: '🔴 N4 Assez Difficile', bg: '#f8d7da', color: '#721c24' };
  return              { label: '⚫ N5 Difficile',         bg: '#343a40', color: '#ffffff' };
}

/* ══ Envoyer une rando ══ */
window.envoyerRando = async function(index) {
  const item = planning[index];
  const btns = document.querySelectorAll('.btn-send');
  const btn  = btns[index];
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    await envoyerViaFormulaire(item, 'add');
    planning.splice(index, 1);
    renderPlanning();
    toast('✅ Envoyé — Sheets et Calendar mis à jour !');
  } catch(err) {
    toast('❌ Erreur : ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '📤'; }
  }
};

/* ══ Envoyer tout ══ */
window.envoyerTout = async function() {
  const btn = document.getElementById('btnEnvoyerTout');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi...'; }
  let ok = 0;
  for (const item of [...planning]) {
    try {
      await envoyerViaFormulaire(item, 'add');
      ok++;
    } catch(e) {}
  }
  planning = [];
  renderPlanning();
  toast('✅ ' + ok + ' rando(s) envoyée(s) !');
};

/* ══ Sync Calendar uniquement ══ */
window.syncRando = async function(index) {
  const item = planning[index];
  toast('📅 Sync Calendar en cours…');
  try {
    await envoyerViaFormulaire(item, 'sync');
    toast('✅ Calendrier mis à jour !');
  } catch(err) {
    toast('❌ Erreur : ' + err.message);
  }
};

/* ══ Supprimer ══ */
window.supprimerRando = function(index) {
  planning.splice(index, 1);
  renderPlanning();
};

/* ══ Vider ══ */
window.viderPlanning = function() {
  if (!confirm('Vider tout le planning ?')) return;
  planning = [];
  renderPlanning();
};

/* ══ Rendu ══ */
function renderPlanning() {
  const list   = document.getElementById('planningList');
  const btnEnv = document.getElementById('btnEnvoyerTout');
  const btnVid = document.getElementById('btnVider');

  if (!planning.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🥾</div>Aucune randonnée programmée.<br>Ajoutez-en une ci-dessus.</div>';
    btnEnv.style.display = btnVid.style.display = 'none';
    return;
  }

  btnEnv.style.display = btnVid.style.display = '';

  list.innerHTML = planning.map((item, i) => {
    const ibpInfo = niveauIBP(item.ibp);
    const ibpPill = ibpInfo
      ? `<span class="ibp-pill" style="background:${ibpInfo.bg};color:${ibpInfo.color}">${ibpInfo.label}</span>`
      : '';
    const dateStr = item.date
      ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })
      : '—';
    const details = [
      item.distance ? item.distance + ' km' : '',
      item.denivele ? '↑' + item.denivele + ' m' : '',
      (item.animateur.split(' ')[0] + ' ' + (item.animateur.split(' ')[1] || '')).trim()
    ].filter(Boolean).join(' · ');

    return `
      <div class="planning-item">
        <div class="date-badge">${dateStr}</div>
        <div class="infos">
          <div class="nom-rando">${item.nom}</div>
          <div class="details">${details}</div>
          ${ibpPill}
        </div>
        <div class="actions">
          <button class="btn-send" onclick="envoyerRando(${i})">📤</button>
          <button class="btn-sync" onclick="syncRando(${i})" title="Sync Calendar" style="background:linear-gradient(135deg,#1978c8,#28a745);color:white;border:none;border-radius:5px;padding:5px 8px;font-size:11px;font-weight:700;font-family:Arial,sans-serif;cursor:pointer;">📅</button>
          <button class="btn-del" onclick="supprimerRando(${i})" title="Supprimer">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ══ Toast ══ */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══ Date par défaut : prochain lundi ══ */
const d = new Date();
const dow = d.getDay();
const diff = dow === 0 ? 1 : dow === 1 ? 7 : (8 - dow);
d.setDate(d.getDate() + diff);
document.getElementById('dateRando').value = d.toISOString().split('T')[0];

/* ══ Lancer ══ */
init();
