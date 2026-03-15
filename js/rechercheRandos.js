import { randos } from "../data/randos.js";

export function activerRecherche() {

  const input = document.getElementById("rechercheRando");
  const suggestionsDiv = document.getElementById("suggestions");
  const nomRando = document.getElementById("nomRando");

  if (!input || !suggestionsDiv || !nomRando) {
    console.error("Éléments de recherche introuvables !");
    return;
  }

  // Filtrer et afficher les suggestions à chaque frappe
  input.addEventListener("input", () => {
    const filtre = input.value.toLowerCase().trim();

    // Effacer les anciennes suggestions
    suggestionsDiv.innerHTML = "";

    if (filtre === "") return;

    // Créer les suggestions filtrées
    const matches = randos.filter(r => r.toLowerCase().includes(filtre));

    matches.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = r;

      // Cliquer sur une suggestion remplit le nom et vide les suggestions
      div.addEventListener("click", () => {
        nomRando.value = r;
        input.value = r; // si tu veux garder le texte tapé
        suggestionsDiv.innerHTML = "";
      });

      suggestionsDiv.appendChild(div);
    });
  });

  // Clic en dehors de la zone pour cacher les suggestions
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-rando")) {
      suggestionsDiv.innerHTML = "";
    }
  });

  // Optionnel : navigation au clavier (flèches + Enter)
  let index = -1;

  input.addEventListener("keydown", (e) => {
    const suggestions = Array.from(suggestionsDiv.children);
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      index = (index + 1) % suggestions.length;
      suggestions.forEach((s, i) => s.classList.toggle("highlight", i === index));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      index = (index - 1 + suggestions.length) % suggestions.length;
      suggestions.forEach((s, i) => s.classList.toggle("highlight", i === index));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (index >= 0 && index < suggestions.length) {
        suggestions[index].click();
        index = -1;
      }
    }
  });
}
