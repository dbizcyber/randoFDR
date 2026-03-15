import { parkings } from "../data/parkings.js";

export function remplirMenuParkings(){

const select = document.getElementById("parkingCovoiturage");

if(!select){
console.error("Menu parking introuvable");
return;
}

select.innerHTML = "";

parkings.forEach(p => {

const option = document.createElement("option");

option.value = p;
option.textContent = p;

select.appendChild(option);

});

const autre = document.createElement("option");
autre.value = "Autre";
autre.textContent = "Autre";

select.appendChild(autre);

}
