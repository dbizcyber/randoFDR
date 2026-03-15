import { animateurs } from "../data/animateurs.js";

export function remplirMenuAnimateurs() {

const select     = document.getElementById("animateur");
const emailUser  = document.getElementById("emailUser");

/* option placeholder */
const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "— Choisir un animateur —";
select.appendChild(placeholder);

animateurs.filter(a => a.nom !== "").forEach(a => {
  const option = document.createElement("option");
  option.value       = a.nom;
  option.dataset.email = a.email || "";
  option.textContent = a.nom;
  select.appendChild(option);
});

/* remplir email automatiquement au choix de l'animateur */
select.addEventListener("change", () => {
  const selected = select.options[select.selectedIndex];
  const email    = selected?.dataset.email || "";
  if (emailUser) emailUser.value = email;
});

}
