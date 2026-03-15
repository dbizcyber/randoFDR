import { animateurs } from "../data/animateurs.js";

export function remplirMenuAnimateurs() {

const select = document.getElementById("animateur");

/* option placeholder */
const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "— Choisir un animateur —";
select.appendChild(placeholder);

animateurs.filter(a => a !== "").forEach(a => {

const option = document.createElement("option");

option.value = a;
option.textContent = a;

select.appendChild(option);

});

}
