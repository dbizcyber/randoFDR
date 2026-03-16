import { calculCovoiturage } from "./covoiturage.js"
import { afficherMeteo } from "./meteoRando.js"

const CHATEAURENARD = [43.88808, 4.84882];

let map
let marker
let routeLine
let pointDepart = CHATEAURENARD  /* point de départ du calcul de route */


/* ══════════════════════════════════════
   INITIALISATION CARTE
══════════════════════════════════════ */
export function initCarte(){

  map = L.map("map").setView(CHATEAURENARD, 10)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom: 19
  }).addTo(map)

  marker = L.marker(CHATEAURENARD, { draggable: false }).addTo(map)

  /* forcer le verrouillage après ajout à la carte */
  marker.dragging.disable()
  marker.setIcon(markerIconBleu())

  window.coordsParking = CHATEAURENARD[0] + "," + CHATEAURENARD[1]

  calculRoute(CHATEAURENARD)
  afficherMeteo(CHATEAURENARD[0], CHATEAURENARD[1])

  /* déplacement marqueur (actif uniquement si draggable) */
  marker.on("dragend", () => {
    const pos = marker.getLatLng()
    calculRoute([pos.lat, pos.lng])
    afficherMeteo(pos.lat, pos.lng)
  })

  /* écouter le changement de parking covoiturage —
     le listener est attaché dans app.js après peuplement du select */
  window._activerMarkerLibre   = activerMarkerLibre
  window._desactiverMarkerLibre = desactiverMarkerLibre

  /* si le user saisit manuellement le parking */
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
   MODE MARKER LIBRE (Autre parking)
══════════════════════════════════════ */
function activerMarkerLibre(){
  marker.dragging.enable()
  marker.setIcon(markerIconOrange())

  /* message indicatif sur la carte */
  document.getElementById("lieuRecherche").placeholder =
    "Rechercher le lieu de départ ou déplacer le marker sur la carte"
}

function desactiverMarkerLibre(){
  marker.dragging.disable()
  marker.setIcon(markerIconBleu())
  marker.setLatLng(CHATEAURENARD)
  map.setView(CHATEAURENARD, 10)
  pointDepart = CHATEAURENARD

  document.getElementById("lieuRecherche").placeholder =
    "Rechercher un lieu, village, département"

  calculRoute(CHATEAURENARD)
  afficherMeteo(CHATEAURENARD[0], CHATEAURENARD[1])
}

/* geocoder le parking saisi manuellement pour repositionner le marker */
function geocoderParkingAutre(texte){
  if(!texte.trim()) return
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texte)}`)
    .then(r => r.json())
    .then(data => {
      if(!data.length) return
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      pointDepart = [lat, lon]
      marker.setLatLng([lat, lon])
      map.setView([lat, lon], 13)
    })
}


/* ══════════════════════════════════════
   ICÔNES MARKER
══════════════════════════════════════ */
function markerIconOrange(){
  return L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  })
}

function markerIconBleu(){
  return L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  })
}


/* ══════════════════════════════════════
   RECHERCHE LIEU (bouton Localiser)
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
   CALCUL ITINÉRAIRE
   Départ = pointDepart (Châteaurenard ou parking "Autre")
   Arrivée = dest (parking de départ rando)
══════════════════════════════════════ */
function calculRoute(dest){

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${pointDepart[1]},${pointDepart[0]};` +
    `${dest[1]},${dest[0]}?overview=full&geometries=geojson`

  fetch(url)
  .then(r => r.json())
  .then(data => {
    if(!data.routes || !data.routes.length) return

    const route = data.routes[0]

    document.getElementById("latParking").textContent = dest[0].toFixed(5)
    document.getElementById("lonParking").textContent = dest[1].toFixed(5)

    window.coordsParking = dest[0].toFixed(5) + "," + dest[1].toFixed(5)

    majAdresse(dest[0], dest[1])

    const distanceKm = route.distance / 1000
    const AR = (distanceKm * 2).toFixed(1)

    document.getElementById("distanceAR").textContent = AR
    calculCovoiturage()

    if(routeLine) map.removeLayer(routeLine)

    routeLine = L.geoJSON(route.geometry,{
      style:{ color:"#e8621a", weight: 4 }
    }).addTo(map)

    map.fitBounds(routeLine.getBounds())
  })
}
