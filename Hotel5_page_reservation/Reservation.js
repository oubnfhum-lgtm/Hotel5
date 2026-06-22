/* ============================================================
   RÉSERVATION — HÔTEL PARLEMENTAIRE — LOGIQUE JS
   ============================================================ */

(() => {
  "use strict";

  /* ----------------------------------------------------------
     1. DONNÉES DES OFFRES (chargées dynamiquement depuis l'API)
  ---------------------------------------------------------- */
  const API_BASE = "http://localhost/api_hotel/";
  const LABELS_CATEGORIE = {
    chambre: "Chambre",
    affaires: "Affaires",
    evenement: "Événement",
  };

  let OFFRES = [];

  function transformerOffreAPI(o) {
    const specs = [];
    if (o.categorie === "chambre") {
      if (o.sous_titre) specs.push(o.sous_titre);
    } else if (o.sous_titre && o.capacite) {
      specs.push(`${o.sous_titre} : ${o.capacite} personnes max`);
    } else if (o.capacite) {
      specs.push(`Capacité : ${o.capacite} personnes max`);
    } else if (o.sous_titre) {
      specs.push(o.sous_titre);
    }

    return {
      id: o.offre_ref,
      categorie: o.categorie,
      titre: `${String(o.numero).padStart(2, "0")}. ${o.titre}`,
      image: o.image ? API_BASE + o.image : "",
      specs,
      prix: parseFloat(o.prix),
      unite: o.unite_prix ? `/ ${o.unite_prix}` : "",
      tag: o.badge_promo || LABELS_CATEGORIE[o.categorie] || "",
      capacite: o.capacite ? parseInt(o.capacite, 10) : undefined,
    };
  }

  async function chargerOffres() {
    try {
      const reponse = await fetch(API_BASE + "offres_api.php?action=liste");
      const data = await reponse.json();
      if (data.succes) {
        OFFRES = data.offres.map(transformerOffreAPI);
      } else {
        console.error("Erreur API offres :", data.message);
      }
    } catch (e) {
      console.error("Impossible de charger les offres :", e);
      if (grilleOffres) {
        grilleOffres.innerHTML =
          '<p style="padding:20px;color:#b91c1c">Impossible de charger les offres pour le moment. Veuillez réessayer plus tard.</p>';
      }
    }
    rendreOffres("chambre");
  }

  const ICONES_CATEGORIE = {
    chambre: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 18h18M3 18v2M21 18v2M5 9V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    affaires: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    evenement: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 21l3.6-9.6a2 2 0 0 1 1.9-1.3h5a2 2 0 0 1 1.9 1.3L20 21M9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM2 21h20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  const NOMS_PAIEMENT = {
    om: "Orange Money",
    momo: "MTN Mobile Money",
    moov: "Moov Money",
    wave: "Wave",
    carte: "Carte bancaire",
    especes: "Espèces à l'hôtel",
  };

  const TAUX_ACOMPTE = 0.3;

  /* ----------------------------------------------------------
     2. ÉTAT GLOBAL
  ---------------------------------------------------------- */
  const etat = {
    etapeActuelle: 1,
    offreSelectionnee: null,
    chambreChoisie: null,
    salleAffairesChoisie: null,
    typeEvenementChoisi: null,
    moyenPaiementChoisi: null,
  };

  /* ----------------------------------------------------------
     3. UTILITAIRES
  ---------------------------------------------------------- */
  const formaterFCFA = (montant) =>
    Math.round(montant)
      .toLocaleString("fr-FR")
      .replace(/\u202f|\u00a0/g, " ") + " FCFA";

  const compterNuits = (arrivee, depart) => {
    if (!arrivee || !depart) return 0;
    const debut = new Date(`${arrivee}T00:00:00`);
    const fin = new Date(`${depart}T00:00:00`);
    const diff = Math.round((fin - debut) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  };

  const calculerPrixTotal = (offre, options = {}) => {
    if (!offre) return { prix: 0, libelle: "—" };

    if (offre.categorie === "chambre") {
      const nuits = Math.max(1, compterNuits(options.arrivee, options.depart));
      const total = offre.prix * nuits;
      return {
        prix: total,
        libelle: `${formaterFCFA(total)} pour ${nuits} nuit${nuits > 1 ? "s" : ""}`,
      };
    }

    return {
      prix: offre.prix,
      libelle: `${formaterFCFA(offre.prix)}${offre.unite ? " " + offre.unite : ""}`,
    };
  };

  const $ = (selecteur, contexte = document) =>
    contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => [
    ...contexte.querySelectorAll(selecteur),
  ];

  const offreParId = (id) => OFFRES.find((o) => o.id === id);

  /* ----------------------------------------------------------
     4. ÉTAPE 1 — RENDU DU CATALOGUE
  ---------------------------------------------------------- */
  const grilleOffres = $("#grille-offres-resa");

  function rendreOffres(filtre = "tout") {
    grilleOffres.innerHTML = "";
    const liste =
      filtre === "tout" ? OFFRES : OFFRES.filter((o) => o.categorie === filtre);

    liste.forEach((offre) => {
      const carte = document.createElement("button");
      carte.type = "button";
      carte.className = "resa__carte-offre";
      carte.dataset.id = offre.id;
      if (etat.offreSelectionnee === offre.id) {
        carte.classList.add("resa__carte-offre--selectionnee");
      }

      const specsHtml = offre.specs.map((s) => `<p>${s}</p>`).join("");

      carte.innerHTML = `
        <img src="${offre.image}" alt="${offre.titre}" />
        <span class="resa__carte-offre__check">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <div class="resa__carte-offre__details">
          <h2>${offre.titre}</h2>
          ${specsHtml}
          <p><b>${formaterFCFA(offre.prix)}${offre.unite ? " " + offre.unite : ""}</b></p>
        </div>
      `;

      carte.addEventListener("click", () => {
        etat.offreSelectionnee = offre.id;
        rendreOffres(filtre);

        preparerEtape2();
        etat.etapeActuelle = 2;
        afficherEtape(2);
        const erreurEtape2 = document.getElementById("erreur-etape2");
        if (erreurEtape2) erreurEtape2.textContent = "";
      });

      grilleOffres.appendChild(carte);
    });
  }

  // Filtres de catégorie
  $$("#categories-offres .resa__categorie").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      $$("#categories-offres .resa__categorie").forEach((b) => {
        b.classList.remove("resa__categorie--actif");
        b.setAttribute("aria-selected", "false");
      });
      bouton.classList.add("resa__categorie--actif");
      bouton.setAttribute("aria-selected", "true");
      rendreOffres(bouton.dataset.categorie);
    });
  });

  chargerOffres();

  /* ----------------------------------------------------------
     5. ÉTAPE 2 — RÉSUMÉ DE L'OFFRE + FORMULAIRES DYNAMIQUES
  ---------------------------------------------------------- */
  const formulaires = {
    chambre: $("#form-chambre"),
    affaires: $("#form-affaires"),
    evenement: $("#form-evenement"),
  };

  function preparerEtape2() {
    const offre = offreParId(etat.offreSelectionnee);
    if (!offre) return;

    const prixResume = calculerPrixTotal(offre, {
      arrivee: $("#ch-arrivee")?.value,
      depart: $("#ch-depart")?.value,
    });

    // Résumé en haut de l'étape 2
    $("#resume-icone").innerHTML = ICONES_CATEGORIE[offre.categorie] || "";
    $("#resume-titre").textContent = offre.titre;
    $("#resume-prix").textContent =
      offre.categorie === "chambre"
        ? `Total estimé : ${prixResume.libelle}`
        : `À partir de ${prixResume.libelle}`;
    $("#resume-tag").textContent = offre.tag;

    // Afficher le bon formulaire
    Object.entries(formulaires).forEach(([cle, form]) => {
      form.classList.toggle("resa__formulaire--actif", cle === offre.categorie);
    });

    if (offre.categorie === "chambre") {
      preparerChoixChambre();
    } else if (offre.categorie === "affaires") {
      preparerChoixAffaires();
    } else if (offre.categorie === "evenement") {
      preparerChoixEvenement();
    }
  }

  /* ---- 5a. Chambres : pastilles de type de chambre ---- */
  function preparerChoixChambre() {
    const conteneur = $("#choix-chambres");
    const chambres = OFFRES.filter((o) => o.categorie === "chambre");
    const champArrivee = $("#ch-arrivee");
    const champDepart = $("#ch-depart");

    function majPrixResumeChambre() {
      const offre = offreParId(etat.chambreChoisie || etat.offreSelectionnee);
      if (!offre || offre.categorie !== "chambre") return;

      const prixResume = calculerPrixTotal(offre, {
        arrivee: champArrivee?.value,
        depart: champDepart?.value,
      });

      $("#resume-prix").textContent = `Total estimé : ${prixResume.libelle}`;
    }

    conteneur.innerHTML = "";
    chambres.forEach((ch) => {
      const pastille = document.createElement("button");
      pastille.type = "button";
      pastille.className = "resa__pastille";
      pastille.dataset.id = ch.id;
      pastille.textContent = `${ch.titre.replace(/^\d+\.\s*/, "")} — ${formaterFCFA(ch.prix)}`;

      if (ch.id === etat.offreSelectionnee) {
        pastille.classList.add("resa__pastille--actif");
        etat.chambreChoisie = ch.id;
      }

      pastille.addEventListener("click", () => {
        $$(".resa__pastille", conteneur).forEach((p) =>
          p.classList.remove("resa__pastille--actif"),
        );
        pastille.classList.add("resa__pastille--actif");
        etat.chambreChoisie = ch.id;
      });

      conteneur.appendChild(pastille);
    });

    if (!etat.chambreChoisie) {
      const premier = $(".resa__pastille", conteneur);
      if (premier) {
        premier.classList.add("resa__pastille--actif");
        etat.chambreChoisie = premier.dataset.id;
      }
    }

    if (champArrivee && champDepart) {
      champArrivee.onchange = majPrixResumeChambre;
      champDepart.onchange = majPrixResumeChambre;
    }

    majPrixResumeChambre();
  }

  /* ---- 5b. Affaires : pastilles de salle ---- */
  function preparerChoixAffaires() {
    const conteneur = $("#choix-affaires");
    const salles = OFFRES.filter((o) => o.categorie === "affaires");
    const bandeau = $("#affaires-info");

    conteneur.innerHTML = "";
    salles.forEach((salle) => {
      const pastille = document.createElement("button");
      pastille.type = "button";
      pastille.className = "resa__pastille";
      pastille.dataset.id = salle.id;
      pastille.textContent = salle.titre.replace(/^\d+\.\s*/, "");

      if (salle.id === etat.offreSelectionnee) {
        pastille.classList.add("resa__pastille--actif");
        etat.salleAffairesChoisie = salle.id;
      }

      pastille.addEventListener("click", () => {
        $$(".resa__pastille", conteneur).forEach((p) =>
          p.classList.remove("resa__pastille--actif"),
        );
        pastille.classList.add("resa__pastille--actif");
        etat.salleAffairesChoisie = salle.id;
        majBandeauAffaires();
      });

      conteneur.appendChild(pastille);
    });

    if (!etat.salleAffairesChoisie) {
      const premier = $(".resa__pastille", conteneur);
      if (premier) {
        premier.classList.add("resa__pastille--actif");
        etat.salleAffairesChoisie = premier.dataset.id;
      }
    }
    majBandeauAffaires();

    function majBandeauAffaires() {
      const salle = offreParId(etat.salleAffairesChoisie);
      if (!salle) return;
      bandeau.querySelector("span").textContent =
        `${salle.titre.replace(/^\d+\.\s*/, "")} — ${salle.capacite} personnes max — ${formaterFCFA(salle.prix)}${salle.unite ? " " + salle.unite : ""}`;

      const champParticipants = $("#af-participants");
      champParticipants.max = salle.capacite;
      champParticipants.placeholder = `Max ${salle.capacite}`;
      $("#af-compteur").textContent =
        `${champParticipants.value || 0} / ${salle.capacite}`;
    }
  }

  $("#af-participants").addEventListener("input", (e) => {
    const salle = offreParId(etat.salleAffairesChoisie);
    const max = salle ? salle.capacite : 0;
    let valeur = parseInt(e.target.value || "0", 10);
    if (valeur > max) {
      valeur = max;
      e.target.value = max;
    }
    $("#af-compteur").textContent = `${valeur || 0} / ${max}`;
  });

  /* ---- 5c. Événement : type d'événement + select de salle ---- */
  function preparerChoixEvenement() {
    $$("#choix-evenement .resa__pastille").forEach((pastille) => {
      pastille.classList.toggle(
        "resa__pastille--actif",
        pastille.dataset.type === etat.typeEvenementChoisi,
      );
      pastille.onclick = () => {
        $$("#choix-evenement .resa__pastille").forEach((p) =>
          p.classList.remove("resa__pastille--actif"),
        );
        pastille.classList.add("resa__pastille--actif");
        etat.typeEvenementChoisi = pastille.dataset.type;
      };
    });

    const select = $("#ev-salle");
    const sallesEvenement = OFFRES.filter((o) => o.categorie === "evenement");
    select.innerHTML = sallesEvenement
      .map(
        (s) =>
          `<option value="${s.id}">${s.titre.replace(/^\d+\.\s*/, "")} (${s.capacite ? s.capacite + "p." : "—"})</option>`,
      )
      .join("");

    if (
      etat.offreSelectionnee &&
      sallesEvenement.some((s) => s.id === etat.offreSelectionnee)
    ) {
      select.value = etat.offreSelectionnee;
    }

    majCompteurInvites();
    select.addEventListener("change", majCompteurInvites);
    $("#ev-invites").addEventListener("input", majCompteurInvites);

    function majCompteurInvites() {
      const salle = offreParId(select.value);
      const max = salle ? salle.capacite || 200 : 200;
      const champ = $("#ev-invites");
      champ.max = max;
      let valeur = parseInt(champ.value || "0", 10);
      if (valeur > max) {
        valeur = max;
        champ.value = max;
      }
      $("#ev-compteur").textContent = `${valeur || 0} / ${max} invités`;
    }
  }

  /* ----------------------------------------------------------
     6. ÉTAPE 3 — RÉCAPITULATIF
  ---------------------------------------------------------- */
  function preparerEtape3() {
    const offre = offreParId(etat.offreSelectionnee);
    if (!offre) return;

    let offreFinale = offre;
    let detailsExtra = [];
    let infosClient = {};
    let prixTotal = offre.prix;
    let libellePrix = `${formaterFCFA(offre.prix)}${offre.unite ? " " + offre.unite : ""}`;

    if (offre.categorie === "chambre") {
      offreFinale = offreParId(etat.chambreChoisie) || offre;
      const f = formulaires.chambre;
      const nuits = compterNuits(
        f.elements["arrivee"].value,
        f.elements["depart"].value,
      );
      const totalChambre = calculerPrixTotal(offreFinale, {
        arrivee: f.elements["arrivee"].value,
        depart: f.elements["depart"].value,
      });
      prixTotal = totalChambre.prix;
      libellePrix = totalChambre.libelle;

      detailsExtra = [
        ["Arrivée", f.elements["arrivee"].value || "—"],
        ["Départ", f.elements["depart"].value || "—"],
        ["Nuits", `${nuits || 1} nuit${(nuits || 1) > 1 ? "s" : ""}`],
        ["Type de lit", f.elements["lit"].value],
        ["Personnes", f.elements["personnes"].value || "1"],
      ];
      infosClient = {
        nom: f.elements["nom"].value,
        tel: f.elements["tel"].value,
        email: f.elements["email"].value,
      };
    } else if (offre.categorie === "affaires") {
      offreFinale = offreParId(etat.salleAffairesChoisie) || offre;
      const f = formulaires.affaires;
      detailsExtra = [
        ["Date", f.elements["date"].value || "—"],
        ["Heure de début", f.elements["heure"].value || "—"],
        ["Durée", f.elements["duree"].value],
        [
          "Participants",
          `${f.elements["participants"].value || 0} / ${offreFinale.capacite}`,
        ],
        ["Équipements", f.elements["equipements"].value],
        ["Restauration", f.elements["restauration"].value],
      ];
      infosClient = {
        nom: f.elements["nom"].value,
        tel: f.elements["tel"].value,
        email: f.elements["email"].value,
        entreprise: f.elements["entreprise"].value,
      };
    } else if (offre.categorie === "evenement") {
      const f = formulaires.evenement;
      const salleChoisie = offreParId(f.elements["salle"].value) || offre;
      offreFinale = salleChoisie;
      detailsExtra = [
        ["Type d'événement", etat.typeEvenementChoisi || "—"],
        ["Date", f.elements["date"].value || "—"],
        ["Heure cérémonie", f.elements["heure"].value || "—"],
        [
          "Invités",
          `${f.elements["invites"].value || 0} / ${salleChoisie.capacite}`,
        ],
        ["Décoration", f.elements["decoration"].value],
        ["Traiteur / Buffet", f.elements["traiteur"].value],
        ["Gâteau", f.elements["gateau"].value],
        ["Sonorisation / DJ", f.elements["sono"].value],
        ["Photographe", f.elements["photographe"].value],
      ];
      infosClient = {
        nom: f.elements["nom"].value,
        tel: f.elements["tel"].value,
        email: f.elements["email"].value,
      };
    }

    $("#recap-image").src = offreFinale.image;
    $("#recap-image").alt = offreFinale.titre;
    $("#recap-tag").textContent = offreFinale.tag;

    $("#recap-titre").textContent = offreFinale.titre;
    const liste = $("#recap-liste");
    liste.innerHTML = detailsExtra
      .map(
        ([label, valeur]) =>
          `<li><span>${label}</span><span>${valeur}</span></li>`,
      )
      .join("");

    $("#recap-prix").textContent = libellePrix;

    const resume = $("#recap-resume");
    const lignesResume = [
      ["Client", infosClient.nom || "—"],
      ["Téléphone", infosClient.tel || "—"],
    ];
    if (infosClient.email) lignesResume.push(["Email", infosClient.email]);
    if (infosClient.entreprise)
      lignesResume.push(["Entreprise", infosClient.entreprise]);
    resume.innerHTML = lignesResume
      .map(
        ([label, valeur]) =>
          `<li><span>${label}</span><span>${valeur}</span></li>`,
      )
      .join("");

    const acompte = prixTotal * TAUX_ACOMPTE;
    $("#recap-acompte").textContent = formaterFCFA(acompte);

    etat.offreFinaleRecap = offreFinale;
    etat.infosClientRecap = infosClient;
    etat.acompteRecap = acompte;
    etat.prixTotalRecap = prixTotal;
  }

  /* ----------------------------------------------------------
     7. PAIEMENT
  ---------------------------------------------------------- */
  const blocNumero = $("#paiement-numero-bloc");
  const champNumero = $("#paiement-numero");
  const labelNumero = $("#paiement-numero-label");

  $$("#paiement-grille .resa__paiement").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      $$("#paiement-grille .resa__paiement").forEach((b) =>
        b.classList.remove("resa__paiement--actif"),
      );
      bouton.classList.add("resa__paiement--actif");
      etat.moyenPaiementChoisi = bouton.dataset.paiement;
      $("#erreur-etape3").textContent = "";

      const moyen = etat.moyenPaiementChoisi;
      if (moyen === "especes") {
        blocNumero.hidden = true;
        return;
      }
      blocNumero.hidden = false;
      if (moyen === "carte") {
        labelNumero.textContent = "Numéro de carte bancaire";
        champNumero.type = "text";
        champNumero.placeholder = "0000 0000 0000 0000";
        champNumero.maxLength = 19;
      } else {
        labelNumero.textContent = "Numéro de téléphone (mobile money)";
        champNumero.type = "tel";
        champNumero.placeholder = "+225 07 00 00 00";
        champNumero.removeAttribute("maxlength");
      }
      champNumero.value = "";
    });
  });

  /* ----------------------------------------------------------
     8. NAVIGATION ENTRE ÉTAPES
  ---------------------------------------------------------- */
  const panels = $$(".resa__panel");
  const stepIcons = $$(".resa__step-icon");
  const progressionPoints = $$(".resa__progression-point");
  const boutonPrecedent = $("#bouton-precedent");
  const boutonSuivant = $("#bouton-suivant");
  const navigationBas = $("#navigation-bas");

  function afficherEtape(numero) {
    panels.forEach((p) =>
      p.classList.toggle(
        "resa__panel--actif",
        p.dataset.panel === String(numero),
      ),
    );

    stepIcons.forEach((icon) => {
      const n = parseInt(icon.dataset.step, 10);
      icon.classList.remove(
        "resa__step-icon--actif",
        "resa__step-icon--complete",
      );
      if (n === numero) icon.classList.add("resa__step-icon--actif");
      else if (n < numero) icon.classList.add("resa__step-icon--complete");
    });

    progressionPoints.forEach((pt) => {
      pt.classList.toggle(
        "resa__progression-point--actif",
        pt.dataset.point === String(numero),
      );
    });

    boutonPrecedent.hidden = numero === 1;
    navigationBas.style.display = numero <= 3 ? "flex" : "none";

    boutonSuivant.querySelector(".bouton__texte").textContent =
      numero === 3 ? "Confirmer la réservation" : "Continuer";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validerEtape1() {
    if (!etat.offreSelectionnee) {
      return "Veuillez sélectionner une offre pour continuer.";
    }
    return null;
  }

  function validerEtape2() {
    const offre = offreParId(etat.offreSelectionnee);
    if (!offre) return "Aucune offre sélectionnée.";
    const form = formulaires[offre.categorie];
    const requis = $$("input[required], select[required]", form);
    for (const champ of requis) {
      if (!champ.value.trim()) {
        champ.focus();
        return "Merci de remplir tous les champs obligatoires (nom, téléphone, dates...).";
      }
    }
    if (offre.categorie === "chambre") {
      const arrivee = form.elements["arrivee"].value;
      const depart = form.elements["depart"].value;
      if (arrivee && depart && depart <= arrivee) {
        return "La date de départ doit être postérieure à la date d'arrivée.";
      }
    }
    return null;
  }

  function validerEtape3() {
    if (!etat.moyenPaiementChoisi) {
      return "Veuillez choisir un moyen de paiement.";
    }
    if (etat.moyenPaiementChoisi !== "especes") {
      const valeur = champNumero.value.trim();
      if (!valeur) {
        champNumero.focus();
        return "Veuillez renseigner vos informations de paiement.";
      }
    }
    return null;
  }

  function genererReference() {
    const date = new Date();
    const aaaa = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const jj = String(date.getDate()).padStart(2, "0");
    const alea = Math.floor(1000 + Math.random() * 9000);
    return `HP-${aaaa}${mm}${jj}-${alea}`;
  }

  /* ----------------------------------------------------------
     9. CONFIRMATION + ENVOI AU BACK-END PHP
  ---------------------------------------------------------- */
  function afficherConfirmation() {
    const ref = genererReference();
    const offre = offreParId(etat.offreSelectionnee);

    // ── Construction du payload selon le type d'offre ──
    const donnees = {
      type_offre:       offre.categorie,
      offre_ref:        etat.offreSelectionnee,
      prix:             etat.prixTotalRecap,
      acompte:          etat.acompteRecap,
      moyen_paiement:   etat.moyenPaiementChoisi,
      numero_paiement:  champNumero.value.trim() || null,
      reference:        ref,
    };

    if (offre.categorie === "chambre") {
      const f = formulaires.chambre;
      Object.assign(donnees, {
        offre_ref:    etat.chambreChoisie,
        nom:          f.elements["nom"].value,
        tel:          f.elements["tel"].value,
        email:        f.elements["email"].value || null,
        type_piece:   f.elements["piece"].value,
        num_piece:    f.elements["piece_numero"].value,
        personnes:    parseInt(f.elements["personnes"].value) || 1,
        arrivee:      f.elements["arrivee"].value,
        depart:       f.elements["depart"].value,
        lit:          f.elements["lit"].value,
        demande:      f.elements["demande"].value || null,
      });

    } else if (offre.categorie === "affaires") {
      const f = formulaires.affaires;
      Object.assign(donnees, {
        offre_ref:    etat.salleAffairesChoisie,
        nom:          f.elements["nom"].value,
        tel:          f.elements["tel"].value,
        email:        f.elements["email"].value || null,
        type_piece:   f.elements["piece"].value,
        num_piece:    f.elements["piece_numero"].value,
        entreprise:   f.elements["entreprise"].value || null,
        date:         f.elements["date"].value,
        heure:        f.elements["heure"].value,
        duree:        f.elements["duree"].value,
        participants: parseInt(f.elements["participants"].value) || 1,
        equipements:  f.elements["equipements"].value,
        restauration: f.elements["restauration"].value,
        remarques:    f.elements["remarques"].value || null,
      });

    } else if (offre.categorie === "evenement") {
      const f = formulaires.evenement;
      Object.assign(donnees, {
        salle_ref:        f.elements["salle"].value,
        nom:              f.elements["nom"].value,
        tel:              f.elements["tel"].value,
        email:            f.elements["email"].value || null,
        type_piece:       f.elements["piece"].value,
        num_piece:        f.elements["piece_numero"].value,
        type_evenement:   etat.typeEvenementChoisi || null,
        invites:          parseInt(f.elements["invites"].value) || 1,
        date:             f.elements["date"].value,
        heure:            f.elements["heure"].value || "00:00",
        decoration:       f.elements["decoration"].value,
        traiteur:         f.elements["traiteur"].value,
        gateau:           f.elements["gateau"].value,
        sono:             f.elements["sono"].value,
        photographe:      f.elements["photographe"].value,
        transfert:        f.elements["transfert"].value,
        demandes:         f.elements["demandes"].value || null,
      });
    }

    // ── Désactiver le bouton pendant l'envoi ──
    boutonSuivant.disabled = true;
    boutonSuivant.querySelector(".bouton__texte").textContent = "Envoi en cours...";

    // ── Envoi au PHP ──
    fetch("http://localhost/api_hotel/reserver.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    })
      .then((res) => res.json())
      .then((data) => {
        boutonSuivant.disabled = false;
        boutonSuivant.querySelector(".bouton__texte").textContent = "Confirmer la réservation";

        if (data.succes) {
          // Remplir l'écran de confirmation
          $("#confirmation-nom").textContent = etat.infosClientRecap?.nom || "cher client";
          $("#confirmation-ref").textContent = ref;
          $("#confirmation-offre").textContent = etat.offreFinaleRecap?.titre || "—";
          $("#confirmation-acompte").textContent = formaterFCFA(etat.acompteRecap || 0);
          $("#confirmation-paiement").textContent = NOMS_PAIEMENT[etat.moyenPaiementChoisi] || "—";
          afficherEtape("confirmation");
        } else {
          $("#erreur-etape3").textContent = "Erreur : " + (data.message || "Problème serveur.");
        }
      })
      .catch(() => {
        boutonSuivant.disabled = false;
        boutonSuivant.querySelector(".bouton__texte").textContent = "Confirmer la réservation";
        $("#erreur-etape3").textContent =
          "Erreur de connexion. Vérifiez que WAMP est bien démarré.";
      });
  }

  boutonSuivant.addEventListener("click", () => {
    let erreur = null;
    if (etat.etapeActuelle === 1) erreur = validerEtape1();
    if (etat.etapeActuelle === 2) erreur = validerEtape2();
    if (etat.etapeActuelle === 3) erreur = validerEtape3();

    const champErreur =
      etat.etapeActuelle === 2 ? $("#erreur-etape2") : $("#erreur-etape3");

    if (erreur) {
      if (champErreur) champErreur.textContent = erreur;
      return;
    }
    if (champErreur) champErreur.textContent = "";

    if (etat.etapeActuelle === 1) {
      preparerEtape2();
      etat.etapeActuelle = 2;
      afficherEtape(2);
    } else if (etat.etapeActuelle === 2) {
      preparerEtape3();
      etat.etapeActuelle = 3;
      afficherEtape(3);
    } else if (etat.etapeActuelle === 3) {
      afficherConfirmation();
    }
  });

  boutonPrecedent.addEventListener("click", () => {
    if (etat.etapeActuelle > 1) {
      etat.etapeActuelle -= 1;
      afficherEtape(etat.etapeActuelle);
    }
  });

  stepIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const cible = parseInt(icon.dataset.step, 10);
      if (cible < etat.etapeActuelle) {
        etat.etapeActuelle = cible;
        afficherEtape(cible);
      } else if (cible === etat.etapeActuelle) {
        // rien
      } else if (cible === etat.etapeActuelle + 1) {
        boutonSuivant.click();
      }
    });
  });

  /* ----------------------------------------------------------
     10. INITIALISATION
  ---------------------------------------------------------- */
  const aujourdHui = new Date().toISOString().split("T")[0];
  ["#ch-arrivee", "#ch-depart", "#af-date", "#ev-date"].forEach((sel) => {
    const champ = $(sel);
    if (champ) champ.min = aujourdHui;
  });

  afficherEtape(1);
})();