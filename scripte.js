/* ============================================================
   scripts.js — Ykaa.Studio (classes renommées en français)
   ============================================================ */

"use strict";

/* ============================================================
   1. ANIMATIONS D'ENTRÉE AU DÉFILEMENT
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {

  // Rendre la page visible immédiatement
  const corps = document.querySelector(".corps");
  if (corps) { corps.style.opacity = "1"; corps.style.animation = "none"; }

  // Éléments enfants à animer quand leur section devient visible
  const selecteursEnfants = [
    ".bloc-titre__colonne-gauche",
    ".bloc-titre__colonne-droite",
    ".bloc-titre__image",
    ".temoignages__titre",
    ".temoignage__carte",
    ".temoignages__mot-fin",
    ".rubrique-titre__haut",
    ".rubrique-titre__bas",
    ".restauration__service",
    ".catalogue-offres__en-tete",
    ".catalogue-offres__barre",
    ".carte-offre",
    ".pied-de-page__logo",
  ].join(",");

  const observateurSections = new IntersectionObserver(
    function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          const section = entree.target;
          section.style.opacity = "1";
          section.style.transform = "none";

          section.querySelectorAll(selecteursEnfants).forEach(function (el) {
            el.style.opacity = "1";
            el.style.transform = "none";
          });

          observateurSections.unobserve(section);
        }
      });
    },
    { threshold: 0.1 }
  );

  // Observer toutes les sections principales
  document.querySelectorAll(
    ".apropos, .restauration, .catalogue-offres, .pied-de-page"
  ).forEach(function (section) {
    observateurSections.observe(section);
  });

  // Héro toujours visible
  const hero = document.querySelector(".hero");
  if (hero) hero.style.opacity = "1";


  /* ----------------------------------------------------------
     2. FILTRAGE DES OFFRES PAR CATÉGORIE
     ---------------------------------------------------------- */

  // Filtre actif courant (mémorisé pour ré-application après rechargement dynamique)
  let filtreActif = "tout";

  // Exposée globalement : appelée par offres_dynamiques.js après injection des cartes
  window.initFiltres = function () {
    const boutonsFiltres = document.querySelectorAll(".filtre-bouton");
    // On relit les cartes dans le DOM à cet instant (cartes dynamiques incluses)
    const grille = document.querySelector(".grille-offres");

    function appliquerFiltre(filtre) {
      filtreActif = filtre;
      const cartes = grille ? grille.querySelectorAll(".carte-offre") : [];
      cartes.forEach(function (carte) {
        const categorie = carte.dataset.categorie || "";
        const afficher  = filtre === "tout" || categorie === filtre;
        carte.style.display = afficher ? "flex" : "none";
        if (afficher) {
          carte.style.opacity = "1";
          carte.style.transform = "none";
        }
      });

      boutonsFiltres.forEach(function (btn) {
        btn.classList.toggle(
          "filtre-bouton--actif",
          btn.dataset.filtre === filtre
        );
      });
    }

    if (boutonsFiltres.length) {
      // Supprimer les anciens écouteurs en remplaçant les boutons (clone)
      boutonsFiltres.forEach(function (btn) {
        const nouveau = btn.cloneNode(true);
        btn.parentNode.replaceChild(nouveau, btn);
      });
      // Ré-attacher sur les nouveaux clones
      document.querySelectorAll(".filtre-bouton").forEach(function (btn) {
        btn.addEventListener("click", function () {
          appliquerFiltre(btn.dataset.filtre || "tout");
        });
      });
      // Appliquer le filtre mémorisé (ou "tout" au premier appel)
      appliquerFiltre(filtreActif);
    }
  };

  // Appel initial : si des cartes statiques sont présentes dans le DOM
  // (cas sans offres_dynamiques.js, ou fallback)
  const grilleStatique = document.querySelector(".grille-offres");
  if (grilleStatique && grilleStatique.querySelectorAll(".carte-offre").length) {
    window.initFiltres();
  }
});


/* ============================================================
   3. MENU BURGER MOBILE
   ============================================================ */
(function () {
  const boutonMenu = document.getElementById("bouton-menu");
  const menuMobile = document.getElementById("menu-mobile");
  const entete     = document.getElementById("entete");

  if (!boutonMenu || !menuMobile) return;

  boutonMenu.addEventListener("click", function () {
    const estOuvert = menuMobile.classList.contains("menu-mobile--ouvert");

    if (estOuvert) {
      menuMobile.classList.remove("menu-mobile--ouvert");
      menuMobile.classList.add("menu-mobile--ferme");
      boutonMenu.classList.remove("bouton-menu--actif");
      if (entete) entete.classList.remove("entete--menu-ouvert");
    } else {
      menuMobile.classList.remove("menu-mobile--ferme");
      menuMobile.classList.add("menu-mobile--ouvert");
      boutonMenu.classList.add("bouton-menu--actif");
      if (entete) entete.classList.add("entete--menu-ouvert");
    }
  });

  // Fermer le menu au clic sur un lien
  menuMobile.querySelectorAll(".menu-mobile__lien").forEach(function (lien) {
    lien.addEventListener("click", function () {
      menuMobile.classList.remove("menu-mobile--ouvert");
      menuMobile.classList.add("menu-mobile--ferme");
      boutonMenu.classList.remove("bouton-menu--actif");
      if (entete) entete.classList.remove("entete--menu-ouvert");
    });
  });
})();


/* ============================================================
   4. NAVIGATION ANCRES (défilement fluide + lien actif)
   ============================================================ */
(function () {
  "use strict";

  // Sélecteurs de navigation (bureau + mobile)
  const configsNav = [
    { conteneur: ".navigation",              classeActive: "navigation__lien--actif" },
    { conteneur: ".menu-mobile__navigation", classeActive: "menu-mobile__lien--actif" },
    { conteneur: ".pied-de-page__navigation", classeActive: "menu-mobile__lien--actif" },
  ];

  const selecteurLiens = 'a[href^="#"]';
  const enteteEl = document.getElementById("entete");

  let tousLesItems = [];
  let sectionsUniques = [];
  let gestionnaireScroll = null;
  let minuteurRedim = null;

  function hauteurEntete() {
    if (!enteteEl) return 0;
    return Math.round(enteteEl.getBoundingClientRect().height) || 0;
  }

  function collecterItems() {
    const items = [];
    configsNav.forEach(function (config) {
      const conteneur = document.querySelector(config.conteneur);
      if (!conteneur) return;
      conteneur.querySelectorAll(selecteurLiens).forEach(function (lien) {
        if (!lien.hash || lien.hash === "#") return;
        let section = null;
        try { section = document.querySelector(decodeURIComponent(lien.hash)); } catch (e) {}
        if (!section) return;
        items.push({ lien, conteneur, classeActive: config.classeActive, section });
      });
    });
    return items;
  }

  function calculerPositionSection(section) {
    const rect = section.getBoundingClientRect();
    return Math.max(0, Math.round(rect.top + window.scrollY) - hauteurEntete());
  }

  function definirLienActif(idSection) {
    configsNav.forEach(function (config) {
      const conteneur = document.querySelector(config.conteneur);
      if (!conteneur) return;
      conteneur.querySelectorAll(selecteurLiens).forEach(function (a) {
        a.classList.remove(config.classeActive);
      });
      if (!idSection) return;
      const cible = conteneur.querySelector(`${selecteurLiens}[href="#${idSection}"]`);
      if (cible) cible.classList.add(config.classeActive);
    });
  }

  function construireEtat() {
    tousLesItems = collecterItems();
    const vus = new Set();
    const tmp = [...tousLesItems].sort((a, b) => {
      return (a.section.getBoundingClientRect().top + window.scrollY)
           - (b.section.getBoundingClientRect().top + window.scrollY);
    });
    sectionsUniques = tmp.filter(function (it) {
      if (!it.section.id || vus.has(it.section.id)) return false;
      vus.add(it.section.id);
      return true;
    });
    return sectionsUniques.length > 0;
  }

  function attacherClics() {
    tousLesItems.forEach(function (it) {
      it.lien.addEventListener("click", function (e) {
        e.preventDefault();
        const top = calculerPositionSection(it.section);
        window.scrollTo({ top, behavior: "smooth" });
        if (history.pushState) history.pushState(null, "", it.lien.getAttribute("href"));
      });
    });
  }

  function creerGestionnaireScroll() {
    let positions = sectionsUniques.map(it => calculerPositionSection(it.section));
    let enAttente = false;

    const gestionnaire = function () {
      if (!enAttente) {
        enAttente = true;
        window.requestAnimationFrame(function () {
          const scroll = Math.round(window.scrollY);
          let idx = 0;
          for (let i = 0; i < positions.length; i++) {
            if (scroll + 1 >= positions[i]) idx = i;
            else break;
          }
          const sectionActive = sectionsUniques[idx];
          if (sectionActive) definirLienActif(sectionActive.section.id);
          enAttente = false;
        });
      }
    };

    gestionnaire.recalculer = function () {
      positions = sectionsUniques.map(it => calculerPositionSection(it.section));
    };

    return gestionnaire;
  }

  function activer() {
    if (gestionnaireScroll) return;
    if (!construireEtat()) return;
    attacherClics();
    gestionnaireScroll = creerGestionnaireScroll();
    window.addEventListener("scroll", gestionnaireScroll, { passive: true });
    gestionnaireScroll();
  }

  function init() {
    activer();

    window.addEventListener("resize", function () {
      clearTimeout(minuteurRedim);
      minuteurRedim = setTimeout(function () {
        if (gestionnaireScroll && gestionnaireScroll.recalculer) {
          gestionnaireScroll.recalculer();
        }
      }, 120);
    });

    window.addEventListener("load", function () {
      if (gestionnaireScroll && gestionnaireScroll.recalculer) {
        gestionnaireScroll.recalculer();
      }
    });

    // Gérer le hash initial dans l'URL
    const hash = window.location.hash;
    if (hash) {
      let cible = null;
      try { cible = document.querySelector(decodeURIComponent(hash)); } catch (e) {}
      if (cible) {
        setTimeout(function () {
          const top = calculerPositionSection(cible);
          window.scrollTo({ top, behavior: "auto" });
          if (gestionnaireScroll) gestionnaireScroll();
        }, 60);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();