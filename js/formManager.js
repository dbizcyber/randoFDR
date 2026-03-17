/* ============================================================
   formManager.js
   1. Sauvegarde automatique dans localStorage
   2. Indicateurs visuels ✅ / ⚠️ par section
   3. Validation champs obligatoires avant envoi
   ============================================================ */

/* ── CHAMPS À SAUVEGARDER ── */
const CHAMPS_SAVE = [
  "rechercheRando", "nomRando", "dateRando", "animateur",
  "parkingCovoiturage", "nouveauParking", "heureRV", "itineraire",
  "autoroute", "technicite", "risque", "remarques",
  "heureDepartMarche", "vitesse", "emailUser",
  "distanceGPX_manuel", "denivele_manuel", "dureeMarche_manuel", "effort_manuel"
];

/* ── CHAMPS OBLIGATOIRES ── */
const CHAMPS_OBLIGATOIRES = [
  { id: "nomRando",            label: "Nom de la randonnée",     section: "infos"    },
  { id: "dateRando",           label: "Date",                    section: "infos"    },
  { id: "animateur",           label: "Animateur",               section: "infos"    },
  { id: "parkingCovoiturage",  label: "Parking covoiturage",     section: "covoit"   },
  { id: "heureRV",             label: "Heure de rendez-vous",    section: "covoit"   },
  { id: "latParking",          label: "Parking départ rando",    section: "parking", isSpan: true },
  { id: "distanceGPX",         label: "Distance GPX",            section: "gpx",     isSpan: true },
  { id: "denivele",            label: "Dénivelé",                section: "gpx",     isSpan: true },
  { id: "dureeMarche",         label: "Durée marche",            section: "gpx",     isSpan: true },
  { id: "technicite",          label: "Technicité (1-5)",        section: "gpx"      },
  { id: "risque",              label: "Risque (1-5)",            section: "gpx"      },
];

/* ── SECTIONS ET LEURS CHAMPS ── */
const SECTIONS_CHAMPS = {
  "infos":             ["nomRando", "dateRando", "animateur"],
  "meteo":             ["meteoEtat"],
  "covoit":            ["parkingCovoiturage", "heureRV"],
  "parking":           ["latParking"],
  "couts":             ["distanceAR"],
  "gpx":               ["distanceGPX", "denivele", "dureeMarche", "technicite", "risque"],
  "profil":            ["heureDepartMarche"],
  "section-remarques": [],
  "resume":            [],
  "envoi":             ["emailUser"],
};

/* Spans validants : ne sont restaurés que si explicitement remplis par l'utilisateur */
const SPANS_VALIDANTS = ["latParking", "lonParking", "distanceGPX", "denivele", "dureeMarche"];

/* Spans cosmétiques : toujours restaurés */
const SPANS_COSMETIQUES = [
  "distanceAR", "meteoEtat", "meteoTemp", "meteoPluie", "meteoVent", "meteoRafales",
  "parkingRandoAdresse", "coutKm", "coutTotal", "cout4", "cout5",
  "ibp", "effort", "heureDepart"
];

/* ── VALEUR D'UN CHAMP ── */
function getValeur(id, isSpan = false) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (isSpan) return el.textContent?.trim() || "";
  return el.value?.trim() || "";
}

/* ══════════════════════════════════════
   1. SAUVEGARDE AUTOMATIQUE
══════════════════════════════════════ */
const STORAGE_KEY  = "randoFDR_form";
const STORAGE_VER  = 2; // incrémenter force une purge si format change

export function initSauvegarde() {
  restaurerFormulaire();

  CHAMPS_SAVE.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = (el.tagName === "SELECT" || el.type === "checkbox") ? "change" : "input";
    el.addEventListener(evt, () => {
      sauvegarderFormulaire();
      majIndicateurs();
    });
  });

  /* Observer les spans qui conditionnent les indicateurs */
  [...SPANS_VALIDANTS, ...SPANS_COSMETIQUES, "meteoEtat", "ibp", "effort", "heureDepart"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(() => {
      sauvegarderFormulaire();
      majIndicateurs();
    }).observe(el, { childList: true, subtree: true, characterData: true });
  });

  console.log("[FormManager] Sauvegarde auto initialisée");
}

function sauvegarderFormulaire() {
  const data = { _ver: STORAGE_VER, _ts: Date.now() };

  /* Champs input/select */
  CHAMPS_SAVE.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value || "";
  });

  /* Spans cosmétiques */
  SPANS_COSMETIQUES.forEach(id => {
    const el = document.getElementById(id);
    if (el) data["_span_" + id] = el.textContent || "";
  });

  /* Spans validants — préfixe distinct */
  SPANS_VALIDANTS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data["_val_" + id] = el.textContent || "";
  });

  /* Flag : parking départ rando choisi explicitement */
  data["_userSet"] = document.getElementById("latParking")?.dataset.userSet || "";

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restaurerFormulaire() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let data;
  try { data = JSON.parse(raw); }
  catch(e) { localStorage.removeItem(STORAGE_KEY); return; }

  /* Purge si version obsolète ou sauvegarde trop ancienne (7 j) */
  if (
    (data._ver === undefined || data._ver < STORAGE_VER) ||
    (data._ts && Date.now() - data._ts > 7 * 24 * 3600 * 1000)
  ) {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[FormManager] Sauvegarde obsolète purgée");
    return;
  }

  /* Champs input/select */
  CHAMPS_SAVE.forEach(id => {
    const el = document.getElementById(id);
    if (el && data[id] !== undefined) {
      el.value = data[id];
      if (el.tagName === "SELECT") el.dispatchEvent(new Event("change"));
    }
  });

  /* Spans cosmétiques — toujours restaurés */
  SPANS_COSMETIQUES.forEach(id => {
    const el = document.getElementById(id);
    if (el && data["_span_" + id] !== undefined) {
      el.textContent = data["_span_" + id];
    }
  });

  /* Spans validants — SEULEMENT si l'utilisateur avait explicitement agi */
  if (data["_userSet"] === "1") {
    SPANS_VALIDANTS.forEach(id => {
      const el = document.getElementById(id);
      if (el && data["_val_" + id] !== undefined) {
        el.textContent = data["_val_" + id];
      }
    });
    const latEl = document.getElementById("latParking");
    if (latEl) latEl.dataset.userSet = "1";
  }

  /* Afficher le champ nouveauParking si Autre */
  const selPark   = document.getElementById("parkingCovoiturage");
  const champAutre = document.getElementById("nouveauParking");
  if (selPark?.value === "__autre__" && champAutre) {
    champAutre.style.display = "block";
  }

  console.log("[FormManager] Formulaire restauré (v" + data._ver + ")");
}

export function effacerSauvegarde() {
  localStorage.removeItem(STORAGE_KEY);
  console.log("[FormManager] Sauvegarde effacée");
}

/* ══════════════════════════════════════
   2. INDICATEURS VISUELS ✅ / ⚠️
══════════════════════════════════════ */
export function initIndicateurs() {
  Object.keys(SECTIONS_CHAMPS).forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const header = section.querySelector(".card-header h2");
    if (!header || header.querySelector(".section-badge")) return;

    const badge = document.createElement("span");
    badge.className = "section-badge";
    badge.style.cssText = "margin-left:8px;font-size:14px;vertical-align:middle;opacity:0.85;";
    header.appendChild(badge);
  });

  majIndicateurs();
}

export function majIndicateurs() {
  Object.entries(SECTIONS_CHAMPS).forEach(([sectionId, champs]) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const badge = section.querySelector(".section-badge");
    if (!badge) return;

    if (champs.length === 0) { badge.textContent = ""; return; }

    const obligDeCette = CHAMPS_OBLIGATOIRES.filter(c => c.section === sectionId);
    if (obligDeCette.length === 0) { badge.textContent = ""; return; }

    const tousRemplis = obligDeCette.every(c => {
      const val = getValeur(c.id, c.isSpan);
      return val !== "" && val !== "—" && val !== "0" &&
             val !== "Cliquez!" &&
             val !== "— Choisir un animateur —" &&
             val !== "— Choisir un parking —";
    });

    badge.textContent = tousRemplis ? "✅" : "⚠️";
  });
}

/* ══════════════════════════════════════
   3. VALIDATION AVANT ENVOI
══════════════════════════════════════ */
export function validerFormulaire() {
  const manquants = CHAMPS_OBLIGATOIRES.filter(champ => {
    const val = getValeur(champ.id, champ.isSpan);
    return val === "" || val === "—" || val === "0" ||
           val === "Cliquez!" ||
           val === "— Choisir un animateur —" ||
           val === "— Choisir un parking —";
  });

  if (manquants.length === 0) return true;
  afficherErreurValidation(manquants);
  return false;
}

function afficherErreurValidation(manquants) {
  document.getElementById("validation-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "validation-overlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(44,26,14,0.55);
    z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background:white;border-radius:16px;padding:24px;max-width:420px;width:100%;
    box-shadow:0 8px 40px rgba(0,0,0,0.25);font-family:'Outfit',Arial,sans-serif;
  `;

  const titre = document.createElement("div");
  titre.style.cssText = "font-size:18px;font-weight:700;color:#c1440e;margin-bottom:12px";
  titre.textContent = "⚠️ Champs obligatoires manquants";
  box.appendChild(titre);

  const intro = document.createElement("div");
  intro.style.cssText = "font-size:14px;color:#2c1a0e;margin-bottom:14px";
  intro.textContent = "Veuillez compléter les champs suivants avant d'envoyer :";
  box.appendChild(intro);

  const liste = document.createElement("ul");
  liste.style.cssText = "margin:0 0 16px 16px;padding:0;font-size:14px;color:#2c1a0e";
  manquants.forEach(c => {
    const li = document.createElement("li");
    li.style.cssText = "margin-bottom:6px";
    li.innerHTML = `<strong style="color:#c1440e">${c.label}</strong>`;
    liste.appendChild(li);

    const el = document.getElementById(c.id);
    if (el && !c.isSpan) {
      el.style.borderColor = "#c1440e";
      el.style.boxShadow   = "0 0 0 3px rgba(193,68,14,0.2)";
      const reset = () => { el.style.borderColor = ""; el.style.boxShadow = ""; };
      el.addEventListener("input",  reset, { once: true });
      el.addEventListener("change", reset, { once: true });
    }
  });
  box.appendChild(liste);

  const btn = document.createElement("button");
  btn.textContent = "OK, je complète";
  btn.style.cssText = `
    width:100%;padding:12px;background:linear-gradient(135deg,#c1440e,#f49d37);
    color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;
    font-family:'Outfit',Arial,sans-serif;cursor:pointer;
  `;
  btn.addEventListener("click", () => {
    overlay.remove();
    const el = document.getElementById(manquants[0].section);
    if (el) {
      const topbar = document.getElementById("topbar");
      const offset = topbar ? topbar.offsetHeight + 12 : 120;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
    }
  });
  box.appendChild(btn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}
