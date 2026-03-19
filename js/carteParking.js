import { calculCovoiturage } from "./covoiturage.js"
import { afficherMeteo } from "./meteoRando.js"

const CHATEAURENARD = [43.88808, 4.84882];

let map
let marker
let routeLine
let pointDepart = CHATEAURENARD

/* ── Trace GPX sur la carte ── */
let gpxLayers = []      /* segments colorés */
let gpxMarkers = []     /* marqueurs départ/arrivée */
let traceVisible = false
let btnTrace = null

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

  /* ── Bouton Trace GPX ── */
  btnTrace = document.createElement("button")
  btnTrace.id = "btnTrace"
  btnTrace.textContent = "🗺 Trace GPX"
  btnTrace.style.cssText = [
    "margin-top:8px",
    "width:100%",
    "background:#f5ead8",
    "color:#5a4a3a",
    "border:1.5px solid #d8cfc4",
    "border-radius:8px",
    "font-size:13px",
    "font-weight:700",
    "padding:8px 12px",
    "cursor:pointer",
    "font-family:Arial,sans-serif",
    "display:none"   /* masqué tant que pas de GPX */
  ].join(";")

  btnTrace.addEventListener("click", toggleTrace)

  /* Insérer après le bouton Localiser */
  const btnGeocoder = document.getElementById("btnGeocoder")
  if(btnGeocoder) btnGeocoder.parentNode.insertBefore(btnTrace, btnGeocoder.nextSibling)

  /* Exposer reset carte */
  window._resetCarte = function() {
    marker.setLatLng(CHATEAURENARD)
    map.setView(CHATEAURENARD, 10)
    if(routeLine){ map.removeLayer(routeLine); routeLine = null }
    pointDepart = CHATEAURENARD
    effacerTrace()
    if(btnTrace){ btnTrace.style.display = "none"; btnTrace.style.cssText += ";background:#f5ead8;color:#5a4a3a;border:1.5px solid #d8cfc4" }
    window.gpxTracePoints = null
  }

  /* Surveiller l'apparition de gpxTracePoints → afficher le bouton */
  const gpxFile = document.getElementById("gpxFile")
  if(gpxFile){
    gpxFile.addEventListener("change", () => {
      /* Attendre que profilAltitude.js ait fini d'analyser */
      setTimeout(() => {
        if(window.gpxTracePoints && window.gpxTracePoints.length > 0){
          btnTrace.style.display = "block"
          traceVisible = false
          styleBtnOff()
        }
      }, 500)
    })
  }
}

/* ══════════════════════════════════════
   TOGGLE TRACE GPX
══════════════════════════════════════ */
function toggleTrace(){
  if(!window.gpxTracePoints || !window.gpxTracePoints.length){
    btnTrace.style.display = "none"
    return
  }

  if(traceVisible){
    effacerTrace()
    styleBtnOff()
  } else {
    afficherTrace()
    styleBtnOn()
  }
}

function afficherTrace(){
  const pts = window.gpxTracePoints
  if(!pts || pts.length < 2) return

  /* Dessiner segment par segment avec couleur selon pente */
  for(let i = 1; i < pts.length; i++){
    const p1 = pts[i-1]
    const p2 = pts[i]
    const couleur = couleurPente(p2.pente)
    const seg = L.polyline(
      [[p1.lat, p1.lon], [p2.lat, p2.lon]],
      { color: couleur, weight: 4, opacity: 0.85 }
    ).addTo(map)
    gpxLayers.push(seg)
  }

  /* Marqueur départ (vert) */
  const debut = pts[0]
  const mkDepart = L.circleMarker([debut.lat, debut.lon], {
    radius: 8, fillColor: "#28a745", fillOpacity: 1,
    color: "white", weight: 2
  }).bindTooltip("🏁 Départ", { permanent: false }).addTo(map)
  gpxMarkers.push(mkDepart)

  /* Marqueur arrivée (rouge) */
  const fin = pts[pts.length - 1]
  const mkArrivee = L.circleMarker([fin.lat, fin.lon], {
    radius: 8, fillColor: "#d9534f", fillOpacity: 1,
    color: "white", weight: 2
  }).bindTooltip("🏁 Arrivée", { permanent: false }).addTo(map)
  gpxMarkers.push(mkArrivee)

  /* Ajuster la vue sur la trace */
  const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lon]))
  map.fitBounds(bounds, { padding: [30, 30] })

  traceVisible = true
}

function effacerTrace(){
  gpxLayers.forEach(l => map.removeLayer(l))
  gpxLayers = []
  gpxMarkers.forEach(m => map.removeLayer(m))
  gpxMarkers = []
  traceVisible = false
}

function styleBtnOn(){
  if(!btnTrace) return
  btnTrace.textContent = "🗺 Trace GPX : ON"
  btnTrace.style.background = "linear-gradient(135deg,#c1440e,#f49d37)"
  btnTrace.style.color = "white"
  btnTrace.style.border = "none"
}

function styleBtnOff(){
  if(!btnTrace) return
  btnTrace.textContent = "🗺 Trace GPX"
  btnTrace.style.background = "#f5ead8"
  btnTrace.style.color = "#5a4a3a"
  btnTrace.style.border = "1.5px solid #d8cfc4"
}

/* Couleur selon la pente — identique à profilAltitude.js */
function couleurPente(p){
  if(p>=20) return "rgb(200,0,0)"
  if(p>=15) return "rgb(255,80,0)"
  if(p>=10) return "rgb(255,150,0)"
  if(p>=5)  return "rgb(255,200,0)"
  if(p>-5)  return "rgb(255,220,0)"
  if(p>-10) return "rgb(150,200,255)"
  if(p>-15) return "rgb(80,150,255)"
  if(p>-20) return "rgb(40,100,255)"
  return "rgb(0,60,200)"
}

/* ══════════════════════════════════════
   MISE À JOUR POINT DE DÉPART COVOIT
══════════════════════════════════════ */
function majPointDepart(valeurSelect) {
  if(valeurSelect === "__autre__"){
    /* le point de départ sera mis à jour par geocoderParkingAutre */
  } else {
    pointDepart = CHATEAURENARD
    if(document.getElementById("latParking")?.dataset.userSet === "1"){
      const pos = marker.getLatLng()
      calculRoute([pos.lat, pos.lng])
    }
  }
}

/* geocoder le parking "Autre" saisi manuellement */
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
    document.getElementById("latParking").dataset.userSet = "1"

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
