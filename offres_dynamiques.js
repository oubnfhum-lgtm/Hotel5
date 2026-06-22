/**
 * ============================================================
 * offres_dynamiques.js
 * À inclure dans index.html ET reservation.html
 * Remplace les offres codées en dur par des données venant de la DB
 * ============================================================
 *
 * INSTALLATION :
 *   1. Copier ce fichier dans votre dossier front-end (ex: js/offres_dynamiques.js)
 *   2. Dans index.html : ajouter <script src="js/offres_dynamiques.js"></script>
 *      juste avant </body>
 *   3. Dans reservation.html : même chose
 *   4. Vider le contenu du <div id="grille-offres"> dans index.html
 *      (laisser seulement le div vide, le JS va le remplir)
 * ============================================================
 */

// ── Configuration ──────────────────────────────────────────
const API_OFFRES = 'http://localhost/api_hotel/offres_api.php';
// Adaptez l'URL selon votre configuration WAMP (port, chemin)

// ── Formater le prix en FCFA ────────────────────────────────
function formatPrix(n) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

// ── Créer une carte offre pour index.html ──────────────────
function creerCarteOffre(offre) {
  const div = document.createElement('div');
  div.className = 'carte-offre';
  div.dataset.categorie = offre.categorie;
  div.dataset.id = offre.offre_ref;

  const imgSrc = offre.image
    ? `http://localhost/api_hotel/${offre.image}`
    : 'image/placeholder.jpg';

  let badgeHTML = '';
  if (offre.badge_promo) {
    badgeHTML = `
      <button class="carte-offre__badge-promo" data-ouvrir="${offre.offre_ref}">
        <span class="carte-offre__badge-texte">${offre.badge_promo}</span>
      </button>`;
  }

  // Ligne de specs selon catégorie
  let specs = '';
  if (offre.categorie === 'chambre') {
    specs = `<li>${offre.sous_titre || 'Chambre'}</li>
             <li>Prix : <b>${formatPrix(offre.prix)} / ${offre.unite_prix}</b></li>`;
  } else {
    specs = `<li>${offre.sous_titre || ''} : <b>${offre.capacite} personnes max</b></li>
             <li>Prix : <b>${formatPrix(offre.prix)} / ${offre.unite_prix}</b></li>`;
  }

  div.innerHTML = `
    <img src="${imgSrc}" alt="${offre.titre}" class="carte-offre__photo"
         onerror="this.src='image/placeholder.jpg'"/>
    <div class="carte-offre__details">
      <h2>${String(offre.numero).padStart(2,'0')}. ${offre.titre}</h2>
      <ul class="carte-offre__specs">${specs}</ul>
    </div>
    ${badgeHTML}
  `;

  return div;
}

// ── Charger et afficher les offres dans index.html ──────────
async function chargerOffresAccueil() {
  const grille = document.getElementById('grille-offres');
  if (!grille) return; // pas sur la page d'accueil

  grille.innerHTML = '<p style="text-align:center;color:#888;padding:40px">Chargement des offres…</p>';

  try {
    const res = await fetch(`${API_OFFRES}?action=liste`);
    const data = await res.json();

    if (!data.succes || !data.offres.length) {
      grille.innerHTML = '<p style="text-align:center;color:#888;padding:40px">Aucune offre disponible.</p>';
      return;
    }

    grille.innerHTML = '';

    data.offres.forEach(offre => {
      grille.appendChild(creerCarteOffre(offre));
    });

    // Ré-initialiser les filtres APRÈS injection des cartes dans le DOM
    if (typeof window.initFiltres === 'function') window.initFiltres();
    // Ré-attacher les boutons promo si nécessaire
    if (typeof attacherBadges === 'function') attacherBadges();

  } catch (err) {
    console.error('Erreur chargement offres:', err);
    grille.innerHTML = '<p style="text-align:center;color:#c00;padding:40px">Impossible de charger les offres. Vérifiez que le serveur PHP est lancé.</p>';
  }
}

// ── Charger les offres dans le select de reservation.html ──
async function chargerOffresReservation() {
  // Cible les éléments select qui ont data-source="offres" OU data-categorie
  // Adapter selon la structure de votre reservation.html
  try {
    const res = await fetch(`${API_OFFRES}?action=liste`);
    const data = await res.json();
    if (!data.succes) return;

    // Stocker globalement pour y accéder depuis reservation.js
    window.OFFRES_DB = data.offres;

    // Déclencher un événement custom que reservation.js peut écouter
    document.dispatchEvent(new CustomEvent('offres:chargees', { detail: data.offres }));

  } catch (err) {
    console.error('Erreur chargement offres réservation:', err);
  }
}

// ── Auto-détection de la page et initialisation ────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('grille-offres')) {
    // Page d'accueil
    chargerOffresAccueil();
  } else {
    // Page de réservation ou autre
    chargerOffresReservation();
  }
});