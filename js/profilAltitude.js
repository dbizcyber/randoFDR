export let chartProfil

export function initProfilGPX(){

document
.getElementById("gpxFile")
.addEventListener("change", lireGPX)

}
/* recalcul simulation si paramètres changent */
document
.getElementById("vitesse")
.addEventListener("input", recalculSimulation)

document
.getElementById("heureDepartMarche")
.addEventListener("input", recalculSimulation)

function recalculSimulation(){

const dist = parseFloat(
document.getElementById("distanceGPX").textContent
)

if(dist) calculSimulation(dist)

}

async function lireGPX(event){

const file = event.target.files[0]

if(!file) return

/* appel API IBP */

calculIBP(file)

/* lecture GPX locale pour profil */

const text = await file.text()

const parser = new DOMParser()
const xml = parser.parseFromString(text,"text/xml")

const points = [...xml.getElementsByTagName("trkpt")]

let distances=[]
let altitudes=[]
let slopes=[]

let totalDist=0

for(let i=1;i<points.length;i++){

const lat1=parseFloat(points[i-1].getAttribute("lat"))
const lon1=parseFloat(points[i-1].getAttribute("lon"))

const lat2=parseFloat(points[i].getAttribute("lat"))
const lon2=parseFloat(points[i].getAttribute("lon"))

const e1 = points[i-1].getElementsByTagName("ele")[0]
const e2 = points[i].getElementsByTagName("ele")[0]

if(!e1 || !e2) continue

const ele1 = parseFloat(e1.textContent)
const ele2 = parseFloat(e2.textContent)

const dist = distance(lat1,lon1,lat2,lon2)

totalDist+=dist

if(dist===0) continue

const pente=((ele2-ele1)/(dist*1000))*100

distances.push(totalDist)
altitudes.push(ele2)
slopes.push(pente)

}

dessinerProfil(distances,altitudes,slopes)

/* calcul temps marche avec distance GPX locale */

calculDuree(totalDist)
  
/* calcul temps marche simulée */
calculSimulation(totalDist) 
}

/* distance haversine */

function distance(lat1,lon1,lat2,lon2){

const R=6371
const dLat=(lat2-lat1)*Math.PI/180
const dLon=(lon2-lon1)*Math.PI/180

const a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2)

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))

return R*c

}

/* appel API IBP */

async function calculIBP(file){

const formData = new FormData()
formData.append("file", file)

const status = document.getElementById("gpx-status")
if(status) status.textContent = "⏳ Analyse du fichier GPX en cours..."

const rep = await fetch(
"https://ibp-proxy.vercel.app/api/ibp",
{
method:"POST",
body:formData
})

const text = await rep.text()
const data = JSON.parse(text)

exploiterIBP(data)

window.gpxImporte = true

if(status) status.textContent = "✅ GPX analysé avec succès"

}

/* affichage données */

function exploiterIBP(data){

if(!data || !data.hiking) return

const hike = data.hiking

document.getElementById("distanceGPX").textContent =
hike.totlengthkm

document.getElementById("denivele").textContent =
hike.accuclimb

document.getElementById("ibp").textContent =
hike.ibp

/* on ne recalcul PAS la durée ici */

calculEffort(hike.ibp)

}

/* durée marche */

function calculDuree(distanceKm){

const vitesse=parseFloat(
document.getElementById("vitesse").value
)

if(!vitesse) return

const heures=distanceKm/vitesse

const h=Math.floor(heures)
const m=Math.round((heures-h)*60)

document.getElementById("dureeMarche").textContent=
`${h}h${m}`

}
function calculSimulation(distanceKm){

const vitesse = parseFloat(
document.getElementById("vitesse").value
)

const heureDepart = document.getElementById("heureDepartMarche").value

if(!vitesse || !heureDepart) return

const heures = distanceKm / vitesse

const h = Math.floor(heures)
const m = Math.round((heures-h)*60)

/* heure départ */

const parts = heureDepart.split(":")
let hDepart = parseInt(parts[0])
let mDepart = parseInt(parts[1])

/* ajout durée */

let hArrivee = hDepart + h
let mArrivee = mDepart + m

if(mArrivee >= 60){
mArrivee -= 60
hArrivee += 1
}

if(hArrivee >= 24){
hArrivee -= 24
}

/* affichage */

document.getElementById("dureeMarcheSim").textContent =
`Durée marche : ${h}h${m}`

document.getElementById("heureArriveeSim").textContent =
`Arrivée estimée : ${hArrivee}h${mArrivee.toString().padStart(2,"0")}`

}
/* calcul Effort */
function calculEffort(ibp){

let effort=""

if(ibp < 25) effort="1"
else if(ibp < 50) effort="2"
else if(ibp < 75) effort="3"
else if(ibp < 100) effort="4"
else effort="5"

document.getElementById("effort").textContent = effort

}
/* couleur pente */

function couleurPente(p){

/* montées */

if(p >= 20) return "rgb(200,0,0)"
if(p >= 15) return "rgb(255,80,0)"
if(p >= 10) return "rgb(255,150,0)"
if(p >= 5)  return "rgb(255,200,0)"

/* plat */

if(p > -5) return "rgb(255,220,0)"

/* descentes */

if(p > -10) return "rgb(150,200,255)"
if(p > -15) return "rgb(80,150,255)"
if(p > -20) return "rgb(40,100,255)"

return "rgb(0,60,200)"

}

/* profil altimétrique */

function dessinerProfil(dist,alt,slopes){

const ctx=document
.getElementById("profilAltitude")

const data=alt.map((a,i)=>({
x:dist[i],
y:a
}))

const colors=slopes.map(p=>couleurPente(p))

if(chartProfil) chartProfil.destroy()

chartProfil = new Chart(ctx,{
type:"line",
data:{
datasets:[{
label:"Profil altimétrique",
data:data,
borderColor:"black",
segment:{
borderColor:ctx=>colors[ctx.p0DataIndex]
},
pointRadius:0,
tension:0
}]
},

options:{
parsing:false,

plugins:{
tooltip:{
callbacks:{
label:function(ctx){

const distance = ctx.raw.x
const altitude = ctx.raw.y
const pente = slopes[ctx.dataIndex].toFixed(1)

const vitesse = parseFloat(
document.getElementById("vitesse").value
)

const heureDepart =
document.getElementById("heureDepartMarche").value

let heurePoint=""

if(vitesse && heureDepart){

const temps = distance / vitesse

const h = Math.floor(temps)
const m = Math.round((temps-h)*60)

const parts = heureDepart.split(":")
let hDepart = parseInt(parts[0])
let mDepart = parseInt(parts[1])

let hPoint = hDepart + h
let mPoint = mDepart + m

if(mPoint >= 60){
mPoint -= 60
hPoint++
}

if(hPoint >= 24){
hPoint -= 24
}

heurePoint = ` | heure ${hPoint}h${mPoint.toString().padStart(2,"0")}`
}

return `Altitude ${altitude} m | Dist ${distance.toFixed(2)} km | pente ${pente}%${heurePoint}`

}
}
}
},

scales:{
x:{
type:"linear",
title:{display:true,text:"Distance (km)"}
},
y:{
title:{display:true,text:"Altitude (m)"}
}
}

}
})

window.chartProfil = chartProfil

}
