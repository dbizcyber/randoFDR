import { remplirMenu } from "./menuRandos.js";
import { activerRecherche } from "./rechercheRandos.js";
import { initHoraires } from "./horairesRando.js";
import { remplirMenuAnimateurs } from "./menuAnimateurs.js";
import { remplirMenuParkings } from "./menuParkings.js";
import { initCarte, chercherLieu } from "./carteParking.js";
import { calculCovoiturage } from "./covoiturage.js";
import { initGPX } from "./gpxAnalyse.js";
import { initProfilGPX } from "./profilAltitude.js";
import { afficherMeteo } from "./meteoRando.js";
import { initResume } from "./resumeRando.js";
import { initEnvoi } from "./envoiRando.js";
import { initSauvegarde, initIndicateurs, majIndicateurs, validerFormulaire, effacerSauvegarde } from "./formManager.js";
import { initGPXManuel } from "./gpxManuel.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Application MeteoRando initialisée");
  const dateInput = document.getElementById("dateRando");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
  /* randonnées */
  remplirMenu();
  activerRecherche();
  initHoraires();
  /* animateurs — chargement async depuis Supabase */
  await remplirMenuAnimateurs();
  /* parkings covoiturage */
  remplirMenuParkings();
  /* gestion carte */
  initCarte();
  const btnGeocoder = document.getElementById("btnGeocoder");
  if (btnGeocoder) btnGeocoder.addEventListener("click", chercherLieu);
  /* liaison parking covoiturage → point de départ calcul distance */
  const selectParking = document.getElementById("parkingCovoiturage");
  if(selectParking) {
    selectParking.addEventListener("change", () => {
      window._majPointDepart && window._majPointDepart(selectParking.value)
    });
  }
  /* coût covoiturage */
  const autoroute = document.getElementById("autoroute");
  if (autoroute) autoroute.addEventListener("input", calculCovoiturage);
  /* gpx */
  initGPX();
  initProfilGPX();
  /* résumé + envoi */
  initResume();
  initEnvoi();
  /* sauvegarde auto + indicateurs + validation */
  initSauvegarde();
  initIndicateurs();
  initGPXManuel();
  /* exposer validerFormulaire pour envoiRando.js */
  window._validerFormulaire = validerFormulaire;
  window._majIndicateurs    = majIndicateurs;
  window._effacerSauvegarde = effacerSauvegarde;
  /* mise à jour météo si date change */
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      const lat = document.getElementById("latParking")?.textContent;
      const lon = document.getElementById("lonParking")?.textContent;
      if (lat && lon) afficherMeteo(lat, lon);
    });
  }

  /* ── Chargement fiche depuis hash URL (#fiche=<id>) ── */
  const hash = window.location.hash;
  if (hash.startsWith("#fiche=")) {
    const ficheId = parseInt(hash.replace("#fiche=", ""));
    if (ficheId) chargerFicheDepuisSupabase(ficheId);
  }
});

/* ══════════════════════════════════════
   CHARGEMENT FICHE PAR ID (hash URL)
══════════════════════════════════════ */
const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE";

async function chargerFicheDepuisSupabase(id) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/fiches?id=eq.${id}&select=*&limit=1`,
      {
        headers: {
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const data = await res.json();
    if (!data || !data.length) {
      console.warn("[Hash] Fiche introuvable id=", id);
      return;
    }
    preRemplirFormulaire(data[0]);
  } catch(e) {
    console.error("[Hash] Erreur chargement fiche:", e.message);
  }
}

function preRemplirFormulaire(f) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
  };
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = val;
  };

  /* Champs texte / date / select */
  setVal("dateRando",          f.date_rando);
  setVal("nomRando",           f.nom_rando);
  setVal("animateur",          f.animateur);
  setVal("heureRV",            f.heure_rv);
  setVal("parkingCovoiturage", f.parking_covoit);
  setVal("remarques",          f.remarques);
  setVal("technicite",         f.technicite);
  setVal("risque",             f.risque);

  /* Champs affichés en textContent (résultats calculés) */
  setTxt("parkingRandoAdresse", f.parking_depart);
  setTxt("latParking",          f.gps ? f.gps.split(",")[0]?.trim() : "");
  setTxt("lonParking",          f.gps ? f.gps.split(",")[1]?.trim() : "");
  setTxt("distanceGPX",         f.distance);
  setTxt("denivele",            f.denivele);
  setTxt("dureeMarche",         f.duree);
  setTxt("ibp",                 f.ibp);
  setTxt("effort",              f.effort);
  setTxt("coutTotal",           f.couts);

  /* Mettre à jour les indicateurs visuels */
  window._majIndicateurs && window._majIndicateurs();

  /* Nettoyer le hash sans recharger la page */
  history.replaceState(null, "", window.location.pathname);

  /* Scroll en haut */
  window.scrollTo({ top: 0, behavior: "smooth" });

  console.log("[Hash] Fiche pré-remplie ✅", f.nom_rando, f.date_rando);
}
