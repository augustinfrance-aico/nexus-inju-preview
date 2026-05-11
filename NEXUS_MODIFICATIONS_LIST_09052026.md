# NEXUS — Liste exhaustive des modifications (call 09/05/2026)

> Source : transcript call Augus + Juan + Iñigo du 09/05/2026 (~1h40)
> Compilé le 11/05/2026
> Statut : à exécuter avant prochaine réunion (date à fixer)
> Méthode : à finir en 2-3 réunions max, ensuite passage à l'esthétique

---

## 1. HUB / NEXUS CORE (page d'accueil)

- [ ] **Éliminer le "Tableau de bord"** redondant — il fait double emploi avec le hub
- [ ] **Chaque menu (Statistiques, Clients, Campagnes, etc.) devient un widget cliquable sur le hub** — on clique = on accède directement à la section
- [ ] **Bouton "Interface principale"** doit ouvrir un **pop-up overlay** avec les options (style screen 2 du dossier Juan/Iñigo) — pas une page entière
- [ ] Le pop-up garde le **fond du hub visible derrière** (clic sur le fond = retour)
- [ ] Maintenir le **fond sombre violet/cyan** PARTOUT (cohérence visuelle hub → core → sections)

---

## 2. PROFIL ENTREPRISE (très enrichi)

### Description entreprise
- [ ] **Bloc "Description"** (texte libre long format) — l'utilisateur écrit l'histoire/spécificité de sa boîte
- [ ] **Bloc "Data & archives"** — dates clés, historique, fondation
- [ ] **Bloc "Composition"** — employés, collaborateurs, équipe
- [ ] **Bloc "Page web"** — URL que l'IA peut lire/scraper pour s'auto-enrichir
- [ ] L'IA Claude doit **comprendre vraiment la boîte** à partir de tout ça (pas juste un ton générique)
- [ ] **Possibilité de coller un lien catalogue** → l'IA scrape et pré-remplit (à étudier techniquement)

### Catalogue produits (très personnalisable)
- [ ] **Nom du produit** ✓ (déjà OK)
- [ ] **Prix** ✓ (déjà OK)
- [ ] **Mini description** par produit (NOUVEAU)
- [ ] **Photo** par produit (NOUVEAU)
- [ ] **Valeur nutritionnelle / Nutri-score** (NOUVEAU — pour resto, alimentaire)
- [ ] **Ingrédients / composition** (NOUVEAU)
- [ ] Réf Augus : "j'ai bossé dans une boîte qui faisait des caisses enregistreuses, je vais faire un truc complet"

---

## 3. MESSAGERIE

### Boutons à rendre fonctionnels (actuellement = pop-up vide)
- [ ] **Suggestion IA** (proposer une réponse contextuelle) — DOIT marcher
- [ ] **Brouillon** — DOIT marcher
- [ ] **Traduction** — DOIT marcher
- [ ] **Les 4 boutons du screen 4** (à identifier précisément côté code)

### Doublons à supprimer
- [ ] **Une seule barre de recherche** (actuellement 2 — supprimer celle du bas, garder celle du haut)
- [ ] **Un seul "Partage en 1 clic"** (actuellement 2 — supprimer le doublon)

### Appel téléphonique
- [ ] **Supprimer "Appel simulé"** (le petit bouton téléphone rouge) — feature trop complexe, à reporter dans phase Voice agent

### Fiche client (depuis messagerie)
- [ ] **Logo stylo** pour modifier les infos manuellement
- [ ] **Téléphone modifiable**, **mail ajoutable**
- [ ] **Unification WhatsApp + mail** — si même personne sur les 2 canaux, une seule fiche
- [ ] **Espace notes pour l'IA** (différent des notes privées) — exemple : "Marie aime qu'on lui parle avec un ton chaleureux"
- [ ] **Bouton "Envoyer un merci"** — actuellement ne fait rien, à fixer
- [ ] **Tout doit être synthétisé à l'intérieur** de la fiche (vue unifiée)

### Filtres dénominations
- [ ] **Filtre par dénomination** (New / VIP / Biz / Récurrent / Occasionnel / Perdu)
- [ ] Chaque dénomination = filtre cliquable pour retrouver les conversations

---

## 4. CRM / CLIENTS

### Boutons à fixer
- [ ] **Bouton "Ajouter client"** — actuellement ne fonctionne pas
- [ ] **Bouton "Voir plus"** dans liste clients — à fixer
- [ ] **Trier par score** — pop-up qui ne fait rien

### Export CSV (avancé)
- [ ] Avant export, **modal de filtre** : "Quel type de CSV veux-tu ?"
  - Clients perdus
  - VIP
  - Récurrents
  - Occasionnels
  - Business
  - Nouveaux
  - Tous
- [ ] **Export sur Google Sheet OU Excel** (au choix)
- [ ] Format propre, pas screenshot

### Ajouter un client (très personnalisable)
- [ ] Téléphone
- [ ] Mail
- [ ] Contexte spécifique (ex : coiffeur — "elle aime être reçue avec un café")
- [ ] Champs personnalisés selon l'activité
- [ ] Cohérent avec la fiche client unifiée de la messagerie

### Suggestions IA dans CRM
- [ ] **Chat Claude branché à toute la base CRM** — l'utilisateur peut poser n'importe quelle question
- [ ] **Apprentissage** : si le patron corrige une info Claude, Claude se rappelle pour la prochaine fois
- [ ] **Partie rappel gérée par Claude**

---

## 5. STATISTIQUES

### Navigation depuis les cadres
- [ ] **Chaque cadre stat clickable mène à l'origine de la donnée**
- [ ] Exemple : clic sur "21 nouveaux clients" → liste des 21 clients + bouton pour aller à la section Clients
- [ ] **Double action** : récap visible + redirection possible vers la section concernée

### Stats à supprimer (en attendant Nexus Finance)
- [ ] **Retirer "Revenu"** dans stats (donnée fausse pour l'instant)
- [ ] **Garder uniquement les stats liées au CORE** (conversations, clients, messages)
- [ ] Tout ce qui finance = exclusif à Nexus Finance plus tard

### Brief audio quotidien
- [ ] **Bouton pause/stop** sur l'audio (actuellement impossible à arrêter)
- [ ] **Sélecteur de vitesse** (3 modes : lent / normal / rapide, style WhatsApp)
- [ ] Voix par défaut : agréable, douce, humaine (pas robotique)
- [ ] À terme : sélecteur tonalité (énergique / calme)

### Export PDF (refonte complète)
- [ ] **Pas de screenshot** ! Ne PAS exporter l'écran tel quel
- [ ] Format **rapport stylé** : titre, intro, sections, données structurées
- [ ] **Bouton "Rapport général"** en bas → exporte TOUT le Nexus Core (stats + clients + campagnes) en un seul PDF complet
- [ ] **Filtre avant export** : choisir quoi exporter (stats seules / général / par section)
- [ ] Pas de boutons EN/ES visibles dans le PDF

### Heatmap (refonte)
- [ ] **Trop gros actuellement** — réduire l'espace
- [ ] **Bouton 7j / 30j doit changer les données** (actuellement statique)
- [ ] **Transformer en "Best hours"** : phrase concise + insights actionnables
- [ ] Exemple : "Tes clients répondent jamais le lundi → écris le vendredi à 13h"

### Top questions de la semaine
- [ ] **S'actualise automatiquement**
- [ ] **Flèches rouges/vertes** pour montrer les mouvements (entrée nouvelle question, montée/descente dans le ranking)
- [ ] Exemple : "Cette question est passée de #2 à #3, fais attention"

### Évolution dans le temps
- [ ] **Multi-périodes** : 7j / 30j / depuis toujours
- [ ] **Indicateurs d'évolution** sur la répartition clients (% en plus/moins par segment vs période précédente)
- [ ] **Historique stocké** : pouvoir voir l'état "il y a 3 semaines"
- [ ] Exemple : "Tes perdus +5% ce mois → attention" / "Tes récurrents +50% → cool"

### Achievements / Gamification
- [ ] **À reporter** dans une phase ultérieure (pas prioritaire)
- [ ] À retravailler quand on aura plus de data sur ce qui motive vraiment

---

## 6. CAMPAGNES

### Création campagne (cible par segment)
- [ ] **Retirer "Normal"** (voir screen Juan/Iñigo)
- [ ] **Possibilité de créer un segment personnalisé qui RESTE** (ex : "Clients qui habitent à Habitacula")
- [ ] **Option "Personnalisé"** : choisir manuellement à qui envoyer (à la pince, par individu)
- [ ] Les segments créés apparaissent dans la liste cible
- [ ] **Ajouter "Récurrent"** dans les segments standards (manquant actuellement)

### Boutons à fixer
- [ ] **Bouton "Importer"** (campagne) — ne fonctionne pas
- [ ] **Bouton "Choisir du catalogue"** (campagne) — ne fonctionne pas
- [ ] **"Sauver comme template"** — ne fonctionne pas
- [ ] **"Sauver comme brouillon"** — ne fonctionne pas
- [ ] **Bouton "Modifier" campagnes automatiques** — ne fonctionne pas
- [ ] **Bouton "Rapport"** à droite (campagnes récentes) — ne fonctionne pas
- [ ] **Bouton "Renvoyer la même campagne"** (NOUVEAU) — pour relancer

### Déclencheurs (campagnes auto)
- [ ] **Adaptatifs** : quand on change le déclencheur, le formulaire s'adapte
- [ ] Pas générique, vraiment utile

### Récupération clients perdus (campagne auto)
- [ ] Actuellement marqué "Pause" sans contrôle
- [ ] **Boutons : Activer / Pause / Supprimer / Modifier**
- [ ] Statut clair et modifiable

### A/B test
- [ ] **Supprimer** (pas clair, ne marche pas)
- [ ] Garder "Générer 3 versions IA" suffit

### Historique campagnes envoyées
- [ ] Quand on clique sur "Campagnes envoyées", **voir la liste détaillée**
- [ ] Par campagne : taux d'ouverture, performance
- [ ] **Laisser "Campagnes récentes" en dessous**

### Taux d'ouverture (via API)
- [ ] Connexion **Gmail API** dans profil → permet d'avoir les vrais taux
- [ ] **Connexion API à faire dans Profil entreprise** :
  - Google Console (auth)
  - Gmail (campagnes mail)
  - Google Calendar (RDV)
  - Google Sheets (export CSV)
  - WhatsApp Business API
  - Instagram (futur)
- [ ] **Sécurité** : API keys jamais visibles côté Supabase client (gros enjeu, surtout avec arrivée Claude Mythos)

### Canaux d'envoi
- [ ] **Mail** = canal prioritaire (pas de risque de ban)
- [ ] **WhatsApp** = à utiliser avec précaution (risque ban compte)
- [ ] À voir : limites/throttling pour protéger les comptes WhatsApp

### Revenu généré (campagnes)
- [ ] **Retirer** en attendant Nexus Finance
- [ ] Remplacer par autre métrique pertinente (taux ouverture, taux réponse, conversion)

### Bibliothèque templates
- [ ] **Bouton "Importer"** doit fonctionner et être vraiment utile
- [ ] Templates pertinents et copiables/modifiables
- [ ] Exemple Saint-Valentin = OK, à enrichir

---

## 7. MODE VACANCES

- [ ] **Beaucoup plus modulable** (actuellement trop simpliste)
- [ ] **Tout gérable** : durée, période, dates précises
- [ ] **Réponse automatique WhatsApp** adaptée selon les choix dans le mode vacances
- [ ] Comprendre l'**absence longue durée** (>1 semaine = ton différent, plus formel)
- [ ] **Personnalisation du message** par mode (vacances courtes / longues / urgences)
- [ ] **Traduction du mode vacances pas complète** — finir la traduction FR/ES

---

## 8. PAIEMENT & BILLING

- [ ] **Bouton "Télécharger facture"** dans historique — ne fonctionne pas
- [ ] **Facture PDF** = vrai rapport complet et détaillé (pas screenshot)
  - Qui a payé
  - Coordonnées complètes
  - Plan / abonnement
  - Période
  - Détail TVA si applicable
- [ ] **Bouton "Changer de plan"** — doit renvoyer vers la sélection plans

---

## 9. INTÉGRATIONS API (Profil entreprise)

Section à créer dans Profil entreprise pour rentrer/connecter :

- [ ] **OpenAI / Anthropic API key** (avec plafond conso configurable par client, ex : 5€/mois max)
- [ ] **Google OAuth** (Gmail + Calendar + Sheets)
- [ ] **WhatsApp Business / WAHA** (selon stack utilisée)
- [ ] **Instagram / Meta** (futur)
- [ ] **Stripe** (paiement)
- [ ] **HubSpot** (CRM externe — futur)

**Sécurité critique** : aucune API key visible côté client/frontend. Stockage backend sécurisé. Augus a noté : "avec Claude Mythos qui sort, les gens vont se faire voler leurs clés — gros enjeu".

---

## 10. POUR LA PROCHAINE RÉUNION (à préparer avant)

- [ ] **Liste des API à fournir aux clients pour les tests** (à préparer côté Augus, Juan/Iñigo veulent une liste claire)
- [ ] **Faire un test final** une fois toutes les API rentrées
- [ ] Méthode validée : 2-3 réunions pour finir le fonctionnel, **ensuite** on attaque l'esthétique (3 prototypes mobiles)

---

## RÉCAP PRIORITAIRE — par catégorie d'effort

### 🔴 BLOCKER (à fixer en priorité)
- Tableau de bord supprimé + transformation en widgets
- Tous les boutons morts (suggestions IA, brouillon, traduction, modifier campagne, sauver template, etc.)
- Heatmap 7j/30j fonctionnel
- Stats cliquables qui mènent à l'origine
- Export PDF en mode rapport (pas screenshot)

### 🟠 IMPORTANT (refontes)
- Profil entreprise enrichi (description + catalogue avec photos/nutri)
- Fiche client unifiée + filtres dénominations
- Mode vacances modulable
- Segments personnalisés persistants pour campagnes
- Historique campagnes envoyées avec taux ouverture

### 🟢 ENRICHISSEMENT (pour boucle suivante)
- Brief audio pause + vitesse + sélecteur voix
- Achievements (à différer)
- Connexions API toutes intégrées
- Sécurité API keys
- Renvoyer même campagne, tendances avec flèches

---

## NOTES POUR L'EXÉCUTION

1. **Chaque modif notée ici = zéro ambiguïté** (Augus a insisté pendant le call)
2. **Tester chaque bouton après modif** avant de présenter
3. **Maintenir cohérence visuelle dark violet/cyan partout**
4. **Pas d'esthétique tant que le fonctionnel n'est pas verrouillé** (ordre validé en call)
5. À chaque modif majeure, faire un push GitHub Pages + envoyer le lien sur WhatsApp à Juan & Iñigo pour validation

---

## RAPPELS STRATÉGIQUES (du call)

- **Vision Juan** : "Nexus = prochain Facebook pour entrepreneurs LATAM, on doit faire le truc le plus stylé possible"
- **Iñigo pragmatique** : "Réduisons à 3 modules initiaux, pas 8"
- **Augus** : "On a tous les jouets, maintenant on construit la vitrine"
- **Méthode** : 2-3 réunions fonctionnelles → puis 3 prototypes design → puis bêta sur 2-3 clients pilotes
