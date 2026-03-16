import { parkings } from "../data/parkings.js";

export function remplirMenuParkings(){

const select = document.getElementById("parkingCovoiturage");
const champAutre = document.getElementById("nouveauParking");

if(!select){
console.error("Menu parking introuvable");
return;
}

select.innerHTML = "";

/* On filtre "Autre..." du tableau pour ne l'ajouter qu'une fois proprement */
parkings.filter(p => !p.startsWith("Autre")).forEach(p => {
const option = document.createElement("option");
option.value = p;
option.textContent = p;
select.appendChild(option);
});

/* Option Autre avec valeur distincte */
const autre = document.createElement("option");
autre.value = "__autre__";
autre.textContent = "Autre... (saisir manuellement)";
select.appendChild(autre);

/* Afficher/masquer le champ de saisie libre */
select.addEventListener("change", () => {
if(select.value === "__autre__"){
champAutre.style.display = "block";
champAutre.focus();
} else {
champAutre.style.display = "none";
champAutre.value = "";
}
});

}
