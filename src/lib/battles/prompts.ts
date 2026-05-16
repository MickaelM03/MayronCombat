export type NarrativeMode = 1 | 2 | 3 | 4 | 5 | 6;

export const NARRATIVE_MODE_META: Record<NarrativeMode, { name: string; icon: string; color: string; requiresPin: boolean; requiresConfirm: boolean }> = {
  1: { name: 'Famille',      icon: '😇', color: 'from-green-500 to-emerald-600',    requiresPin: false, requiresConfirm: false },
  2: { name: 'Comique',      icon: '😄', color: 'from-yellow-400 to-orange-500',    requiresPin: true,  requiresConfirm: false },
  3: { name: 'Sérieux',      icon: '🎤', color: 'from-blue-500 to-indigo-600',      requiresPin: true,  requiresConfirm: false },
  4: { name: 'Léger',        icon: '😏', color: 'from-orange-400 to-amber-500',     requiresPin: true,  requiresConfirm: false },
  5: { name: 'Trash',        icon: '🔥', color: 'from-red-500 to-red-700',          requiresPin: true,  requiresConfirm: false },
  6: { name: 'Hardcore',     icon: '💀', color: 'from-gray-700 to-black',           requiresPin: true,  requiresConfirm: true  },
};

export function getNarrativeDirectives(mode: NarrativeMode, p1Name: string, p2Name: string, matchDuration: number): string {
  const baseRules = (moveLabel: string) => `
4. STRUCTURE TTS : Chaque valeur du champ "text" DOIT commencer par "Nom: ". Exemple: "${p1Name}: Ta réplique ici !".
5. DYNAMISME : Fais EXACTEMENT ${matchDuration} rounds. Chaque round doit comporter plusieurs échanges de coups.
6. FINITION : Termine par un ${moveLabel} épique.`;

  switch (mode) {
    case 1:
      return `1. TON FAMILIAL : Le jeu est en mode FAMILLE. AUCUN gros mot, AUCUNE insulte. Vocabulaire enfant, bienveillant.
2. HUMOUR DOUX : Jeux de mots simples, onomatopées fun (BOUM, PAF, OUILLE, WAOUH). Référencez les univers des personnages avec humour gentil.
3. PERSONNAGES : Respecte les personnalités à 100% mais en version douce et amusante. Pas de violence graphique.${baseRules('SUPER MOVE drôle et spectaculaire (pas de violence)')}`;

    case 2:
      return `1. HUMOUR ABSURDE ET CARTOON : Aucun gros mot mais humour totalement déjanté. Références Tex Avery, Looney Tunes, gags visuels absurdes décrits à l'oral.
2. TON THÉÂTRAL ET EXAGÉRÉ : Effets sonores cartoonesques (SPLAT, BOING, ZING), réactions exagérées, situations improbables. Tout est prétexte à la comédie.
3. PERSONNAGES : Exploite au maximum le côté comique de chaque personnage, leurs tics verbaux, leurs absurdités.${baseRules('COMEDY FINISH absurde et hilarant')}`;

    case 3:
      return `1. TON PROFESSIONNEL ET DRAMATIQUE : Aucun gros mot, AUCUN humour. Tu es un commentateur sportif professionnel. Style MMA/boxe pro.
2. VOCABULAIRE TECHNIQUE : Utilise des termes de combat précis (contre-attaque, esquive, uppercut, jab, garde haute). Décris les coups avec précision et tension dramatique.
3. ENJEU ÉPIQUE : Crée une tension narrative style anime shōnen (Dragon Ball, Naruto, One Piece). Chaque round est une montée en puissance. Le narrateur prend le combat au sérieux.${baseRules('FINISHING BLOW technique et cinématographique')}`;

    case 4:
      return `1. TON COMIQUE ET PIQUANT : Humour absurde et cartoonesque comme le mode COMIQUE (gags, onomatopées SPLAT/BOING/ZING, situations ridicules) AVEC quelques petits gros mots autorisés : merde, bâtard, connard, salaud, con, crétin, bordel, putain, enfoiré, abruti. INTERDIT ABSOLU : insultes sexuelles ou crues (pute, salope, enculé, fils de pute, ta mère, etc.).
2. VANNES ET CHAMBRAGES : Les personnages se chambrent avec mordant mais l'objectif reste l'humour. Ça pétille, ça vanne, ça déconne — jamais méchant gratuit.
3. PERSONNAGES : Exploite leur côté comique avec un soupçon de mordant, défauts amplifiés pour le fun.${baseRules('SUPER COMBO drôle et un peu cinglant')}`;

    case 5:
      return `1. TON TRASH ET HUMOUR NOIR : Lâche-toi ! Gros mots autorisés (putain, merde, bâtard, salaud, bordel, connard). Trashtalk violent, cynique et humoristique. Les insultes doivent fuser et être créatives.
2. INTONATIONS ET ÉMOTIONS : Ajoute beaucoup d'expressions sonores, de cris (Aaaargh, D'oh, Grrr), d'onomatopées. Ponctuation forte (!, ?, ...) pour la synthèse vocale.
3. PERSONNAGES : Respecte les personnalités à 100% mais en version énervée et trash.${baseRules('FATALITY épique, absurde et violente')}`;

    case 6:
      return `1. TON HARDCORE SANS FILTRE : Tout vocabulaire autorisé sans limite. Insultes créatives au maximum, humour très noir, références adultes (alcool, cigarette, cynisme extrême). Style Tarantino ou South Park.
2. VIOLENCE GRAPHIQUE EXAGÉRÉE : Décris les coups avec exagération cartoonesque à l'extrême. Chaos total, situation hors de contrôle, humour de mauvais goût assumé.
3. PERSONNAGES : Version la plus trash et extrême de chaque personnage, leurs pires défauts amplifiés au maximum.${baseRules('ULTRA FATALITY tellement excessive que c\'est absurde')}`;
  }
}

export function getNarrativeModeLabel(mode: NarrativeMode): string {
  const meta = NARRATIVE_MODE_META[mode];
  return `${meta.icon} MODE ${meta.name.toUpperCase()}`;
}
