import { calculCovoiturage } from "./covoiturage.js"

/* Exposer pour saisie manuelle distanceAR */
window._calculCovoiturage = calculCovoiturage;
import { afficherMeteo } from "./meteoRando.js"

const CHATEAURENARD = [43.88808, 4.84882];

let map
let marker
let routeLine
let pointDepart = CHATEAURENARD

// 🔥 OPTIMISATION ROUTAGE
let abortController = null
const cacheRoutes = new Map()
let debounceTimer = null

const DEBOUNCE_DELAY = 250
const MAX_CACHE_SIZE = 50

/* ══════════════════════════════════════
   INITIALISATION CARTE
══════════════════════════════════════ */
export function initCarte(){

  map = L.map("map").setView(CHATEAURENARD, 10)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom: 19
  }).addTo(map)

  marker = L.marker(CHATEAURENARD, { draggable: true }).addTo(map)

  window.coordsParking = ""

  marker.on("dragend", () => {
    const pos = marker.getLatLng()
    calculRoute([pos.lat, pos.lng])
    afficherMeteo(pos.lat, pos.lng)
  })

  window._majPointDepart = majPointDepart

  const champAutre = document.getElementById("nouveauParking")
  if(champAutre){
    champAutre.addEventListener("keydown", e => {
      if(e.key === "Enter") geocoderParkingAutre(champAutre.value)
    })
    champAutre.addEventListener("blur", () => {
      if(champAutre.value.trim()) geocoderParkingAutre(champAutre.value)
    })
  }
}

/* ══════════════════════════════════════
   MISE À JOUR POINT DE DÉPART COVOIT
══════════════════════════════════════ */
function majPointDepart(valeurSelect) {
  if(valeurSelect === "__autre__"){
  } else {
    pointDepart = CHATEAURENARD
    if(document.getElementById("latParking")?.dataset.userSet === "1"){
      const pos = marker.getLatLng()
      calculRoute([pos.lat, pos.lng])
    }
  }
}

/* geocoder parking autre */
function geocoderParkingAutre(texte){
  if(!texte.trim()) return
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texte)}`)
    .then(r => r.json())
    .then(data => {
      if(!data.length) return
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      pointDepart = [lat, lon]
      const pos = marker.getLatLng()
      calculRoute([pos.lat, pos.lng])
    })
}

/* ══════════════════════════════════════
   RECHERCHE LIEU
══════════════════════════════════════ */
export function chercherLieu(){

  const texte = document.getElementById("lieuRecherche").value

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texte)}`)
  .then(r => r.json())
  .then(data => {
    if(!data.length) return

    const lat = parseFloat(data[0].lat)
    const lon = parseFloat(data[0].lon)

    document.getElementById("parkingRandoAdresse").textContent = data[0].display_name

    marker.setLatLng([lat, lon])
    map.setView([lat, lon], 13)

    window.coordsParking = lat + "," + lon

    calculRoute([lat, lon])
    afficherMeteo(lat, lon)
  })
}

/* ══════════════════════════════════════
   REVERSE GEOCODING
══════════════════════════════════════ */
function majAdresse(lat, lon){
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
  .then(r => r.json())
  .then(data => {
    if(!data || !data.display_name) return
    document.getElementById("parkingRandoAdresse").textContent = data.display_name
  })
}

/* ══════════════════════════════════════
   CALCUL ITINÉRAIRE ULTRA OPTIMISÉ
══════════════════════════════════════ */
function calculRoute(dest){

  clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {

    const key = approxKey(pointDepart, dest)

    if(window._lastRouteKey === key){
      return
    }
    window._lastRouteKey = key

    // ✅ cache
    if(cacheRoutes.has(key)){
      afficherRoute(cacheRoutes.get(key), dest)
      return
    }

    // ✅ annuler requête précédente
    if(abortController){
      abortController.abort()
    }
    abortController = new AbortController()

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pointDepart[1]},${pointDepart[0]};` +
      `${dest[1]},${dest[0]}` +
      `?overview=full` +
      `&geometries=geojson` +
      `&alternatives=true` +
      `&annotations=distance,duration`

    fetch(url, { signal: abortController.signal })
    .then(r => r.json())
    .then(data => {
      if(!data.routes || !data.routes.length) return

      // 🔥 meilleur trajet intelligent
const route = data.routes.reduce((best, current) =>
  current.distance < best.distance ? current : best
)

      // ✅ limite cache
      if(cacheRoutes.size > MAX_CACHE_SIZE){
        const firstKey = cacheRoutes.keys().next().value
        cacheRoutes.delete(firstKey)
      }

      cacheRoutes.set(key, route)

      afficherRoute(route, dest)
    })
    .catch(err => {
      if(err.name !== "AbortError"){
        console.error("Erreur OSRM :", err)
      }
    })

  }, DEBOUNCE_DELAY)
}

/* 🔧 clé approximative */
function approxKey(start, end){
  return `${round(start[0])},${round(start[1])}-${round(end[0])},${round(end[1])}`
}

function round(n){
  return Math.round(n * 500) / 500
}

/* affichage route */
function afficherRoute(route, dest){

  document.getElementById("latParking").textContent = dest[0].toFixed(5)
  document.getElementById("lonParking").textContent = dest[1].toFixed(5)

  window.coordsParking = dest[0].toFixed(5) + "," + dest[1].toFixed(5)
  document.getElementById("latParking").dataset.userSet = "1"

  majAdresse(dest[0], dest[1])

  const distanceKm = route.distance / 1000
  const AR = (distanceKm * 2).toFixed(1)

  const elAR = document.getElementById("distanceAR");
  if (elAR && !elAR.dataset.manuel) {
    if (elAR.tagName === "INPUT") elAR.value = AR;
    else elAR.textContent = AR;
  }

  calculCovoiturage()

  if(routeLine) map.removeLayer(routeLine)

  routeLine = L.geoJSON(route.geometry,{
    style:{ color:"#e8621a", weight: 4 }
  }).addTo(map)

  map.fitBounds(routeLine.getBounds())
}
