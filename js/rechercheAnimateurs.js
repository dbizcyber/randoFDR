import { animateurs } from "../data/animateurs.js";

export function activerRechercheAnimateur(){

const champ = document.getElementById("rechercheAnimateur");
const select = document.getElementById("animateur");

champ.addEventListener("input", () => {

const filtre = champ.value.toLowerCase();

select.innerHTML = "";

animateurs
.filter(a => a.toLowerCase().includes(filtre))
.forEach(a => {

const option = document.createElement("option");

option.value = a;
option.textContent = a;

select.appendChild(option);

});

});

}
