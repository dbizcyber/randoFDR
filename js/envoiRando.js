console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

export function initEnvoi() {
  const btn = document.getElementById("btnEnvoyer");

  if (!btn) {
    console.warn("Bouton Envoyer introuvable");
    return;
  }

  btn.addEventListener("click", envoyerRando);
}

async function envoyerRando() {

  console.log("envoyerRando déclenché");

  try {

    const resume =
      document.getElementById("resumeRando")?.textContent.trim();

    const emailUser =
      document.getElementById("emailUser")?.value.trim();

    if (!resume) {
      alert("Veuillez générer le résumé avant l'envoi");
      return;
    }

    if (!emailUser) {
      alert("Veuillez saisir un email");
      return;
    }

    /* récupération du profil */

let profilPNG = null;

if(chartProfil){
  profilPNG = chartProfil.toBase64Image();
  console.log("profil capturé :", profilPNG.substring(0,40));
}else{
  console.warn("profil non disponible");
}

    /* appel serveur */

    const response = await fetch(
      "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE"
        },
        body: JSON.stringify({
          resume: resume,
          emailUser: emailUser,
          profilPNG: profilPNG
        })
      }
    );

    const data = await response.json();

    console.log("réponse serveur :", data);

    if (data.success) {
      alert("Email envoyé avec profil");
    } else {
      alert("Erreur serveur : " + data.error);
    }

  }
  catch (err) {

    console.error("Erreur JS :", err);

    alert("Erreur réseau : " + err.message);

  }

}
