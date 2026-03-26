console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

export function initEnvoi() {
  const btn = document.getElementById("btnEnvoyer");
  if (!btn) { console.warn("Bouton Envoyer introuvable"); return; }
  btn.addEventListener("click", envoyerRando);
}

/* ══════════════════════════════════════
   POPUP STYLISÉ (remplace alert)
══════════════════════════════════════ */
function afficherPopup({ icone, titre, message, couleur = "#c1440e", bouton = "OK", onClose }) {
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
    msg.textContent = message;
    box.appendChild(msg);
  }

  const btn = document.createElement("button");
  btn.textContent = bouton;
  btn.style.cssText = `
    padding:11px 32px;
    background:linear-gradient(135deg,#c1440e,#f49d37);
    color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;
    font-family:'Outfit',Arial,sans-serif;cursor:pointer;
  `;
  btn.addEventListener("click", () => { overlay.remove(); onClose && onClose(); });
  box.appendChild(btn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) { overlay.remove(); onClose && onClose(); } });
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
