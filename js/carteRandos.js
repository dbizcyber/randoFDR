/* carteRandos.js — script classique (pas de module ES)
   Les données viennent de window.randosCoords (randosCoordsGlobal.js) */

(function() {

var randosCoords = window.randosCoords || [];

/* ══ INIT CARTE ══ */
var map = L.map('map', { center: [43.9, 5.0], zoom: 9 });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* ══ CLUSTERS ══ */
var clusterKnown    = L.markerClusterGroup({ chunkedLoading: true });
var clusterAuto     = L.markerClusterGroup({ chunkedLoading: true });
var clusterNotFound = L.markerClusterGroup({ chunkedLoading: true });

/* ══ ICÔNES ══ */
function makeIcon(color) {
  return L.divIcon({
    html: '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}

var iconKnown    = makeIcon('#1978c8');
var iconAuto     = makeIcon('#28a745');
var iconNotFound = makeIcon('#d9534f');

/* ══ ZOOM seuil pour afficher les étiquettes ══ */
var ZOOM_LABELS = 11;

/* ══ AJOUT MARKER ══ */
function ajouterMarker(item, cluster, icon, geocoded) {
  var badge = geocoded
    ? '<br><span style="font-size:10px;background:#fff3cd;color:#856404;padding:1px 5px;border-radius:4px">géocodé auto</span>'
    : '';
  var coords = '<br><span style="font-size:11px;color:#888">'
    + item.lat.toFixed(5) + ', ' + item.lon.toFixed(5) + '</span>';

  var marker = L.marker([item.lat, item.lon], { icon: icon });

  /* Popup au clic */
  marker.bindPopup('<strong>' + item.nom + '</strong>' + coords + badge);

  /* Tooltip permanent (étiquette) — affiché selon zoom */
  marker.bindTooltip(item.nom, {
    permanent: true,
    direction: 'right',
    offset: [8, 0],
    className: 'label-rando'
  });

  marker.addTo(cluster);
}

/* ══ STATS ══ */
var nbTotal    = randosCoords.length;
var nbOk       = 0;
var nbGeocoded = 0;
var nbNok      = 0;

function majStats() {
  document.getElementById('stat-total').textContent    = nbTotal;
  document.getElementById('stat-ok').textContent       = nbOk;
  document.getElementById('stat-geocoded').textContent = nbGeocoded;
  document.getElementById('stat-nok').textContent      = nbNok;
}

/* ══ AFFICHAGE / MASQUAGE étiquettes selon zoom ══ */
function majLabels() {
  var zoom = map.getZoom();
  var afficher = zoom >= ZOOM_LABELS;
  document.querySelectorAll('.label-rando').forEach(function(el) {
    el.style.display = afficher ? '' : 'none';
  });
}

map.on('zoomend', majLabels);

/* ══ TRAITEMENT : coords connues ══ */
var connus    = randosCoords.filter(function(r) { return r.lat !== null; });
var aGeocoder = randosCoords.filter(function(r) { return r.lat === null; });
var bounds    = [];

connus.forEach(function(r) {
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
majLabels(); /* état initial */

/* ══ GÉOCODAGE automatique (Promises chainées) ══ */
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function geocoder(nom) {
  var q = encodeURIComponent(nom + ', Provence, France');
  var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + q;
  return fetch(url, { headers: { 'Accept-Language': 'fr' } })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.length) {
        return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
      }
      return null;
    })
    .catch(function() { return null; });
}

async function lancerGeocodage() {
  if (aGeocoder.length === 0) return;

  var bar  = document.getElementById('geocode-bar');
  var msg  = document.getElementById('geocode-msg');
  var fill = document.getElementById('progress-fill');
  bar.style.display = 'block';

  for (var i = 0; i < aGeocoder.length; i++) {
    var r = aGeocoder[i];
    msg.textContent = '⏳ ' + (i + 1) + ' / ' + aGeocoder.length + ' — ' + r.nom;
    fill.style.width = Math.round((i + 1) / aGeocoder.length * 100) + '%';

    var result = await geocoder(r.nom);
    if (result) {
      r.lat = result.lat; r.lon = result.lon;
      ajouterMarker(r, clusterAuto, iconAuto, true);
      nbGeocoded++;
    } else {
      nbNok++;
      var jLat = 43.5 + Math.random() * 0.8;
      var jLon = 4.5  + Math.random() * 1.5;
      L.marker([jLat, jLon], { icon: iconNotFound })
        .bindPopup('<strong>' + r.nom + '</strong><br><em style="color:#d9534f">Non localisé</em>')
        .addTo(clusterNotFound);
    }
    majStats();
    majLabels();
    await sleep(1100);
  }

  bar.style.display = 'none';
}

lancerGeocodage();

})();
