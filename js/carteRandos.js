import { randosCoords } from '../data/randosCoords.js';

/* ══ INIT CARTE ══ */
const map = L.map('map', { center: [43.9, 5.0], zoom: 9 });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* ══ CLUSTERS ══ */
const clusterKnown    = L.markerClusterGroup({ chunkedLoading: true });
const clusterAuto     = L.markerClusterGroup({ chunkedLoading: true });
const clusterNotFound = L.markerClusterGroup({ chunkedLoading: true });

/* ══ ICÔNES ══ */
function makeIcon(color) {
  return L.divIcon({
    html: '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
    className: '', iconSize: [16,16], iconAnchor: [8,8], popupAnchor: [0,-8]
  });
}

const iconKnown    = makeIcon('#1978c8');
const iconAuto     = makeIcon('#28a745');
const iconNotFound = makeIcon('#d9534f');

/* ══ GÉOCODAGE Nominatim ══ */
async function geocoder(nom) {
  const q = encodeURIComponent(nom + ', Provence, France');
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + q;
  try {
    const r = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const d = await r.json();
    if (d.length) return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
  } catch(e) {}
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ══ AJOUT MARKER ══ */
function ajouterMarker(item, cluster, icon, geocoded) {
  const badge = geocoded ? '<br><span style="font-size:10px;background:#fff3cd;color:#856404;padding:1px 5px;border-radius:4px">géocodé auto</span>' : '';
  const coords = '<br><span style="font-size:11px;color:#888">' + item.lat.toFixed(5) + ', ' + item.lon.toFixed(5) + '</span>';
  L.marker([item.lat, item.lon], { icon: icon })
    .bindPopup('<strong>' + item.nom + '</strong>' + coords + badge)
    .addTo(cluster);
}

/* ══ STATS ══ */
let nbTotal = randosCoords.length;
let nbOk = 0, nbGeocoded = 0, nbNok = 0;

function majStats() {
  document.getElementById('stat-total').textContent    = nbTotal;
  document.getElementById('stat-ok').textContent       = nbOk;
  document.getElementById('stat-geocoded').textContent = nbGeocoded;
  document.getElementById('stat-nok').textContent      = nbNok;
}

/* ══ TRAITEMENT PRINCIPAL ══ */
const connus    = randosCoords.filter(r => r.lat !== null);
const aGeocoder = randosCoords.filter(r => r.lat === null);
const bounds    = [];

/* 1. Coords connues → affichage immédiat */
connus.forEach(r => {
  ajouterMarker(r, clusterKnown, iconKnown, false);
  bounds.push([r.lat, r.lon]);
  nbOk++;
});

clusterKnown.addTo(map);
clusterAuto.addTo(map);
clusterNotFound.addTo(map);

if (bounds.length > 0) {
  map.fitBounds(bounds, { padding: [20, 20] });
}

majStats();

/* 2. Géocodage automatique des sans-coords */
async function lancerGeocodage() {
  if (aGeocoder.length === 0) return;

  const bar  = document.getElementById('geocode-bar');
  const msg  = document.getElementById('geocode-msg');
  const fill = document.getElementById('progress-fill');
  bar.style.display = 'block';

  for (let i = 0; i < aGeocoder.length; i++) {
    const r = aGeocoder[i];
    msg.textContent = '⏳ ' + (i+1) + ' / ' + aGeocoder.length + ' — ' + r.nom;
    fill.style.width = Math.round((i+1) / aGeocoder.length * 100) + '%';

    const result = await geocoder(r.nom);
    if (result) {
      r.lat = result.lat; r.lon = result.lon;
      ajouterMarker(r, clusterAuto, iconAuto, true);
      nbGeocoded++;
    } else {
      nbNok++;
      /* marker rouge positionné aléatoirement près du centre */
      const jLat = 43.5 + Math.random() * 0.8;
      const jLon = 4.5  + Math.random() * 1.5;
      L.marker([jLat, jLon], { icon: iconNotFound })
        .bindPopup('<strong>' + r.nom + '</strong><br><em style="color:#d9534f">Non localisé</em>')
        .addTo(clusterNotFound);
    }
    majStats();
    await sleep(1100);
  }

  bar.style.display = 'none';
  msg.textContent = '✅ Géocodage terminé';
}

lancerGeocodage();
