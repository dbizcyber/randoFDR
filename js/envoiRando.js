console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkOcGRb6QvmWYZsll4crnH4Al3sIXhfQHdd0YpR3_sB-X0tdP8lhXSPMMuh74UmJ22ag/exec";

export function initEnvoi() {
  const btn = document.getElementById("btnEnvoyer");
  if (!btn) { console.warn("Bouton Envoyer introuvable"); return; }
  btn.addEventListener("click", envoyerRando);
}

/* ══════════════════════════════════════
   POPUP STYLISÉ
══════════════════════════════════════ */
function afficherPopup({ icone, titre, message, couleur = "#c1440e", bouton = "OK", onClose }) {
  document.getElementById("envoi-popup")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "envoi-popup";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,26,14,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";

  const box = document.createElement("div");
  box.style.cssText = "background:white;border-radius:16px;padding:28px 24px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.25);font-family:'Outfit',Arial,sans-serif;text-align:center;";

  const ico = document.createElement("div");
  ico.style.cssText = "font-size:40px;margin-bottom:12px;";
  ico.textContent = icone;
  box.appendChild(ico);

  const tit = document.createElement("div");
  tit.style.cssText = "font-size:18px;font-weight:700;color:"+couleur+";margin-bottom:10px;";
  tit.textContent = titre;
  box.appendChild(tit);

  if (message) {
    const msg = document.createElement("div");
    msg.style.cssText = "font-size:14px;color:#2c1a0e;margin-bottom:20px;line-height:1.5;";
    msg.textContent = message;
    box.appendChild(msg);
  }

  const btn = document.createElement("button");
  btn.textContent = bouton;
  btn.style.cssText = "padding:11px 32px;background:linear-gradient(135deg,#c1440e,#f49d37);color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:'Outfit',Arial,sans-serif;cursor:pointer;transform:none;box-shadow:none;";
  btn.addEventListener("click", () => { overlay.remove(); onClose && onClose(); });
  box.appendChild(btn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) { overlay.remove(); onClose && onClose(); } });
}

/* ══════════════════════════════════════
   COLLECTE DES DONNÉES
══════════════════════════════════════ */
function collecterFiche(profilPNG) {
  const val = id => document.getElementById(id)?.value?.trim() || "";
  const txt = id => document.getElementById(id)?.textContent?.trim() || "";

  return {
    date_rando:     val("dateRando")             || null,
    nom_rando:      val("nomRando")              || null,
    animateur:      val("animateur")             || null,
    parking_covoit: val("parkingCovoiturage") === "__autre__"
                    ? val("nouveauParking")
                    : val("parkingCovoiturage"),
    heure_rv:       val("heureRV")               || null,
    parking_depart: txt("parkingRandoAdresse")   || null,
    const lat = txt("latParking");
    const lon = txt("lonParking");
    gps: (lat && lat !== "—" && lon && lon !== "—") ? `${lat},${lon}` : null,
    distance:       parseFloat(txt("distanceGPX"))  || parseFloat(val("distanceGPX_manuel"))  || null,
    denivele:       parseInt(txt("denivele"))        || parseInt(val("denivele_manuel"))        || null,
    duree:          txt("dureeMarche")              || val("dureeMarche_manuel")               || null,
    ibp:            parseInt(txt("ibp"))             || null,
    effort:         parseInt(txt("effort"))          || parseInt(val("effort_manuel"))          || null,
    technicite:     parseInt(val("technicite"))      || null,
    risque:         parseInt(val("risque"))           || null,
    couts:          txt("coutTotal")                 || null,
    remarques:      val("remarques")                 || null,
    profil_png:     profilPNG                        || null,
    statut:         "publiée",
  };
}

/* ══════════════════════════════════════
   SAUVEGARDE SUPABASE (indépendante)
══════════════════════════════════════ */
async function sauvegarderFiche(fiche) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fiches`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer":        "return=minimal"
      },
      body: JSON.stringify(fiche)
    });
    if (!res.ok) {
      console.warn("[Supabase] Erreur sauvegarde:", res.status, await res.text());
      return false;
    }
    console.log("[Supabase] Fiche sauvegardée ✅");
    return true;
  } catch(e) {
    console.warn("[Supabase] Erreur réseau sauvegarde:", e.message);
    return false;
  }
}

/* ══════════════════════════════════════
   ENVOI EMAIL (indépendant)
══════════════════════════════════════ */
async function envoyerEmail(resume, emailUser, profilPNG) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/dynamic-handler`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ resume, emailUser, profilPNG })
      }
    );
    const data = await res.json();
    console.log("[Email] réponse:", data);
    return data.success === true;
  } catch(e) {
    console.warn("[Email] Erreur réseau:", e.message);
    return false;
  }
}

/* ══════════════════════════════════════
   SYNC GOOGLE SHEETS + CALENDAR
   Via Apps Script (GET + iframe, contournement CORS)
══════════════════════════════════════ */
function syncGoogleSheets(fiche) {
  return new Promise((resolve) => {
    /* Créer l'iframe cachée si elle n'existe pas encore */
    let iframe = document.getElementById("iframe_hidden_envoi");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.name = "iframe_hidden_envoi";
      iframe.id   = "iframe_hidden_envoi";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const params = {
      action:    "add",
      date:      fiche.date_rando  || "",
      animateur: fiche.animateur   || "",
      nom:       fiche.nom_rando   || "",
      ibp:       fiche.ibp         || "",
      distance:  fiche.distance    || "",
      denivele:  fiche.denivele    || "",
    };

    const form = document.createElement("form");
    form.method  = "GET";
    form.action  = APPS_SCRIPT_URL;
    form.target  = "iframe_hidden_envoi";
    form.style.display = "none";

    Object.entries(params).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type  = "hidden";
      input.name  = k;
      input.value = v;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    console.log("[Google] Envoi Apps Script ✅", params);

    /* Résoudre après 2,5 s — on ne peut pas lire la réponse (CORS) */
    setTimeout(() => {
      form.parentNode?.removeChild(form);
      resolve(true);
    }, 2500);
  });
}

/* ══════════════════════════════════════
   ENVOI PRINCIPAL
══════════════════════════════════════ */
async function envoyerRando() {
  console.log("envoyerRando déclenché");

  if (window._validerFormulaire && !window._validerFormulaire()) return;

  const resume    = document.getElementById("resumeRando")?.textContent.trim();
  const emailUser = document.getElementById("emailUser")?.value.trim();

  if (!resume) {
    afficherPopup({ icone:"📋", titre:"Résumé manquant", message:"Veuillez générer le résumé avant l'envoi.", bouton:"OK" });
    return;
  }
  if (!emailUser) {
    afficherPopup({ icone:"📧", titre:"Email manquant", message:"Veuillez saisir un email.", bouton:"OK" });
    return;
  }

  const btnEnvoyer = document.getElementById("btnEnvoyer");
  if (btnEnvoyer) { btnEnvoyer.disabled = true; btnEnvoyer.textContent = "⏳ Envoi en cours…"; }

  try {
    /* Récupération du profil */
    let profilPNG = null;
    if (window.profilExportBase64) {
      profilPNG = window.profilExportBase64;
    } else if (chartProfil) {
      profilPNG = chartProfil.toBase64Image();
    }

    /* Collecte unique de la fiche (partagée entre les 3 appels) */
    const fiche = collecterFiche(profilPNG);

    /* ── 1, 2 et 3 en parallèle : email + Supabase + Google Sheets/Calendar ── */
    const [emailOk, saveOk, _gsOk] = await Promise.all([
      envoyerEmail(resume, emailUser, profilPNG),
      sauvegarderFiche(fiche),
      syncGoogleSheets(fiche)
    ]);

    console.log("[Résultat] email:", emailOk, "supabase:", saveOk, "google:", _gsOk);

    /* Message selon résultat email + supabase (Google est best-effort) */
    if (emailOk && saveOk) {
      afficherPopup({
        icone: "✅", titre: "Fiche envoyée !",
        message: "Email envoyé, fiche archivée et planning Google mis à jour.",
        couleur: "#2a7a2a", bouton: "Super !",
        onClose: () => { window._effacerSauvegarde && window._effacerSauvegarde(); }
      });
    } else if (emailOk && !saveOk) {
      afficherPopup({
        icone: "📧", titre: "Email envoyé",
        message: "Email envoyé mais l'archivage dans l'historique a échoué.",
        couleur: "#2a7a2a", bouton: "OK",
        onClose: () => { window._effacerSauvegarde && window._effacerSauvegarde(); }
      });
    } else if (!emailOk && saveOk) {
      afficherPopup({
        icone: "⚠️", titre: "Fiche archivée",
        message: "Fiche sauvegardée dans l'historique mais l'envoi email a échoué. Réessayez l'envoi.",
        couleur: "#856404", bouton: "OK"
      });
    } else {
      afficherPopup({
        icone: "❌", titre: "Erreur",
        message: "L'envoi email et l'archivage ont échoué. Vérifiez votre connexion et réessayez.",
        bouton: "Fermer"
      });
    }

  } catch (err) {
    console.error("Erreur JS :", err);
    afficherPopup({
      icone: "⚠️", titre: "Erreur inattendue",
      message: err.message, bouton: "Fermer"
    });
  } finally {
    if (btnEnvoyer) { btnEnvoyer.disabled = false; btnEnvoyer.textContent = "Envoyer"; }
  }
}
