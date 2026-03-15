import { animateurs } from "../data/animateurs.js";

export function remplirMenuAnimateurs() {

const select = document.getElementById("animateur");

animateurs.forEach(a => {

const option = document.createElement("option");

option.value = a;
option.textContent = a;

select.appendChild(option);

});

}
