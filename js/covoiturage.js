const PRIX_KM = 0.30

export function calculCovoiturage(){

const km = parseFloat(
document.getElementById("distanceAR").textContent
) || 0

const autoroute =
parseFloat(document.getElementById("autoroute").value) || 0

/* cout km */

const coutKm = km * PRIX_KM

/* total */

const total = coutKm + autoroute

/* partage */

const par4 = total / 4
const par5 = total / 5

/* affichage */

document.getElementById("coutKm").textContent =
coutKm.toFixed(2) + " €"

document.getElementById("coutTotal").textContent =
total.toFixed(2) + " €"

document.getElementById("cout4").textContent =
par4.toFixed(2) + " €"

document.getElementById("cout5").textContent =
par5.toFixed(2) + " €"

}
