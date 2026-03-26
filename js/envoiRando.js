console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

// ══════════════════════════════════════
//  URL Apps Script du planning — à ne pas modifier
// ══════════════════════════════════════
const PLANNING_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkOcGRb6QvmWYZsll4crnH4Al3sIXhfQHdd0YpR3_sB-X0tdP8lhXSPMMuh74UmJ22ag/exec";

export function initEnvoi() {
  const btn = document.getElementById("btnEnvoyer");
  if (!btn) { console.warn("Bouton Envoyer introuvable"); return; }
  btn.addEventListener("click", envoyerRando);
}

/* ══════════════════════════════════════
   POPUP STYLISÉ (remplace alert)
══════════════════════════════════════ */
function afficherPopup({ icone, titre, message, couleur = "#c1440e", bouton = "OK", onClose, bouton2, onClose2 }) {
  document.getElementById("envoi-popup")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "envoi-popup";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(44,26,14,0.55);
    z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background:white;border-radius:16px;padding:28px 24px;max-width:400px;width:100%;
    box-shadow:0 8px 40px rgba(0,0,0,0.25);font-family:'Outfit',Arial,sans-serif;
    text-align:center;
  `;

  const ico = document.createElement("div");
  ico.style.cssText = "font-size:40px;margin-bottom:12px;";
  ico.textContent = icone;
  box.appendChild(ico);

  const tit = document.createElement("div");
  tit.style.cssText = `font-size:18px;font-weight:700;color:${couleur};margin-bottom:10px;`;
  tit.textContent = titre;
  box.appendChild(tit);

  if (message) {
    const msg = document.createElement("div");
    msg.style.cssText = "font-size:14px;color:#2c1a0e;margin-bottom:20px;line-height:1.5;";
    msg.innerHTML = message;   // innerHTML pour le saut de ligne HTML dans les conflits
    box.appendChild(msg);
  }

  // Conteneur boutons (1 ou 2)
  const btnWrap = document.createElement("div");
  btnWrap.style.cssText = "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;";

  const styleBtn = `
    padding:11px 32px;
    background:linear-gradient(135deg,#c1440e,#f49d37);
    color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;
    font-family:'Outfit',Arial,sans-serif;cursor:pointer;
  `;
  const styleBtnSecondary = `
    padding:11px 32px;
    background:#e2e8f0;
    color:#4a5568;border:none;border-radius:8px;font-size:15px;font-weight:600;
    font-family:'Outfit',Arial,sans-serif;cursor:pointer;
  `;

  const btnPrimary = document.createElement("button");
  btnPrimary.textContent = bouton;
  btnPrimary.style.cssText = styleBtn;
  btnPrimary.addEventListener("click", () => { overlay.remove(); onClose && onClose(); });
  btnWrap.appendChild(btnPrimary);

  // Bouton secondaire optionnel (pour les conflits : Garder / Écraser)
  if (bouton2) {
    const btnSec = document.createElement("button");
    btnSec.textContent = bouton2;
    btnSec.style.cssText = styleBtnSecondary;
    btnSec.addEventListener("click", () => { overlay.remove(); onClose2 && onClose2(); });
    btnWrap.appendChild(btnSec);
  }

  box.appendChild(btnWrap);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) { overlay.remove(); onClose && onClose(); } });
}

/* ══════════════════════════════════════
   EXTRACTION des données de synchro
   depuis le résumé texte déjà généré
   (champs lus depuis le DOM de la FDR)
══════════════════════════════════════ */
function extraireDonneesSynchro() {
  // Date : l'input#date contient YYYY-MM-DD
  const dateISO = document.getElementById("date")?.value?.trim() || "";

  // Animateur : input#animateur
  const animateur = document.getElementById("animateur")?.value?.trim() || "";

  // IBP : input#ibp (peut être vide)
  const ibp = document.getElementById("ibp")?.value?.trim() || "";

  // Distance : input#distance
  const distance = document.getElementById("distance")?.value?.trim() || "";

  // Dénivelé : input#denivele
  const denivele = document.getElementById("denivele")?.value?.trim() || "";

  return { dateISO, animateur, ibp, distance, denivele };
}

/* ══════════════════════════════════════
   SYNCHRO PLANNING
   Appelée après un envoi Supabase réussi.
   1. Vérifie que date + animateur sont dispo
   2. Appelle le planning avec action=sync&checkConflict=1
   3. Si conflit → popup demande à l'utilisateur
   4. Si ok → mise à jour silencieuse
══════════════════════════════════════ */
async function syncPlanning(donnees) {
  const { dateISO, animateur, ibp, distance, denivele } = donnees;

  // Rien à synchroniser si données manquantes
  if (!dateISO || !animateur) {
    console.warn("Synchro planning ignorée : date ou animateur manquant.");
    return;
  }

  // Au moins une valeur technique à synchroniser
  if (!ibp && !distance && !denivele) {
    console.info("Synchro planning ignorée : aucune donnée technique (IBP/Distance/Dénivelé).");
    return;
  }

  try {
    // Étape 1 : vérification des conflits
    const checkParams = new URLSearchParams({
      action:        "syncCheck",
      date:          dateISO,
      animateur,
      ibp:           ibp       || "",
      distance:      distance  || "",
      denivele:      denivele  || ""
    });

    const checkRes  = await fetch(PLANNING_SCRIPT_URL + "?" + checkParams.toString());
    const checkData = await checkRes.json();

    if (!checkData.found) {
      // Ligne introuvable dans le planning → on informe, pas bloquant
      console.info("Synchro planning : ligne non trouvée pour", dateISO, animateur);
      return;
    }

    if (checkData.conflicts && checkData.conflicts.length > 0) {
      // Construire le message de conflit lisible
      const lignes = checkData.conflicts.map(c =>
        `• ${c.champ} : planning = <strong>${c.ancien}</strong>, FDR = <strong>${c.nouveau}</strong>`
      ).join("<br>");

      // Popup avec choix utilisateur
      await new Promise(resolve => {
        afficherPopup({
          icone:   "⚠️",
          titre:   "Conflit de données",
          message: `Des valeurs différentes existent déjà dans le planning :<br><br>${lignes}<br><br>Que souhaitez-vous faire ?`,
          couleur: "#b45309",
          bouton:  "📋 Garder le planning",
          onClose: () => resolve("keep"),
          bouton2: "📲 Utiliser la FDR",
          onClose2: async () => {
            await appelSyncPlanning({ dateISO, animateur, ibp, distance, denivele, force: true });
            resolve("overwrite");
          }
        });
      });

    } else {
      // Pas de conflit → mise à jour silencieuse
      await appelSyncPlanning({ dateISO, animateur, ibp, distance, denivele, force: false });
    }

  } catch (err) {
    // La synchro est non-bloquante : on log sans interrompre l'utilisateur
    console.error("Erreur synchro planning :", err);
  }
}

/* Appel réel de mise à jour vers le planning */
async function appelSyncPlanning({ dateISO, animateur, ibp, distance, denivele, force }) {
  const params = new URLSearchParams({
    action:    "sync",
    date:      dateISO,
    animateur,
    ibp:       ibp      || "",
    distance:  distance || "",
    denivele:  denivele || "",
    force:     force ? "1" : "0"
  });
  const res  = await fetch(PLANNING_SCRIPT_URL + "?" + params.toString());
  const data = await res.json();
  if (data.success) {
    console.info("✅ Planning synchronisé avec la FDR.");
  } else {
    console.warn("Synchro planning KO :", data.error);
  }
}

/* ══════════════════════════════════════
   ENVOI
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

  /* Bouton en état chargement */
  const btnEnvoyer = document.getElementById("btnEnvoyer");
  if (btnEnvoyer) { btnEnvoyer.disabled = true; btnEnvoyer.textContent = "⏳ Envoi en cours…"; }

  try {
    let profilPNG = null;
    if (window.profilExportBase64) {
      profilPNG = window.profilExportBase64;
      console.log("profil export capturé (canvas fixe 1200x450)");
    } else if (chartProfil) {
      profilPNG = chartProfil.toBase64Image();
      console.log("profil fallback Chart.js");
    } else {
      console.warn("profil non disponible");
    }

    const response = await fetch(
      "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE"
        },
        body: JSON.stringify({ resume, emailUser, profilPNG })
      }
    );

    const data = await response.json();
    console.log("réponse serveur :", data);

    if (data.success) {
      // ── Synchro planning (non bloquante) ──────────────────
      const donneesSynchro = extraireDonneesSynchro();
      await syncPlanning(donneesSynchro);
      // ──────────────────────────────────────────────────────

      afficherPopup({
        icone: "✅",
        titre: "Fiche envoyée !",
        message: "L'email a bien été envoyé avec la fiche et le profil d'altitude.",
        couleur: "#2a7a2a",
        bouton: "Super !",
        onClose: () => { window._effacerSauvegarde && window._effacerSauvegarde(); }
      });
    } else {
      afficherPopup({
        icone: "❌",
        titre: "Erreur serveur",
        message: data.error || "Une erreur est survenue côté serveur.",
        bouton: "Fermer"
      });
    }

  } catch (err) {
    console.error("Erreur JS :", err);
    afficherPopup({
      icone: "⚠️",
      titre: "Erreur réseau",
      message: err.message,
      bouton: "Fermer"
    });
  } finally {
    if (btnEnvoyer) { btnEnvoyer.disabled = false; btnEnvoyer.textContent = "Envoyer"; }
  }
}
