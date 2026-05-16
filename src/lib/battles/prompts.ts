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
  // Plus de rounds = plus de dialogues par round pour une histoire qui s'étoffe
  const dialoguesPerRound = matchDuration <= 3 ? 4 : matchDuration <= 5 ? 5 : 6;
  const totalDialogues = matchDuration * dialoguesPerRound;

  const baseRules = (moveLabel: string) => `
4. STRUCTURE TTS : Chaque valeur du champ "text" DOIT commencer par "Nom: ". Exemple: "${p1Name}: Ta réplique ici !".
5. 🎯 LONGUEUR ET STRUCTURE (PRIORITÉ ABSOLUE) : Fais EXACTEMENT ${matchDuration} rounds. Chaque round DOIT contenir AU MINIMUM ${dialoguesPerRound} dialogues (≈ ${totalDialogues} dialogues au total). Plus le combat est long, plus l'histoire doit s'étoffer.
6. 📖 VRAIE HISTOIRE (PRIORITÉ ABSOLUE) : Ce n'est PAS qu'un combat — c'est une HISTOIRE. Construis un arc narratif :
   - Avant le 1er coup : pose le contexte (pourquoi ces deux personnages s'affrontent ICI, dans CETTE arène, avec leurs styles précis). Utilise l'Arbitre pour la mise en scène.
   - Round 1 : prise de contact, jaugeage mutuel, premiers échanges révélateurs des personnalités.
   - Rounds intermédiaires : montée en intensité, retournements, moments de tension, le décor de l'arène intervient (objets, ambiance, dangers, public).
   - Round final : climax dramatique, l'enjeu culmine.
   - Conclusion : aftermath, conséquences, transformation des personnages.
7. 🏟️ ARÈNE VIVANTE : L'arène n'est PAS un simple décor. Elle DOIT interagir (objets utilisables, public qui réagit, dangers du lieu, atmosphère qui change). Au moins 1 mention narrative par round.
8. ⚔️ STYLES DE COMBAT : Les styles choisis DOIVENT teinter chaque coup décrit. Si P1 est "Capoeira Foirée" et P2 "Boxe Anglaise", ça se SENT dans la chorégraphie.
9. 🎭 PERSONNALITÉ : Chaque personnage parle SELON sa personnalité vocale ET son univers d'origine (références à sa série/film/jeu).
10. FINITION : Termine par un ${moveLabel} épique cohérent avec l'histoire racontée.`;

  switch (mode) {
    case 1:
      return `1. TON FAMILIAL : Le jeu est en mode FAMILLE. AUCUN gros mot, AUCUNE insulte. Vocabulaire enfant, bienveillant.
2. HUMOUR DOUX : Jeux de mots simples, onomatopées fun (BOUM, PAF, OUILLE, WAOUH). Références gentilles aux univers des personnages.
3. PERSONNAGES : Personnalités à 100% mais en version douce et amusante. Pas de violence graphique. Conflit symbolique, pas méchant.${baseRules('SUPER MOVE drôle et spectaculaire (pas de violence)')}`;

    case 2:
      return `1. HUMOUR ABSURDE ET CARTOON : Aucun gros mot mais humour totalement déjanté. Références Tex Avery, Looney Tunes, gags visuels absurdes décrits à l'oral.
2. TON THÉÂTRAL ET EXAGÉRÉ : Effets sonores cartoonesques (SPLAT, BOING, ZING), réactions exagérées, situations improbables. Tout est prétexte à la comédie.
3. PERSONNAGES : Exploite au maximum le côté comique de chaque personnage, leurs tics verbaux, leurs absurdités. L'histoire est une SUCCESSION DE GAGS qui s'enchaînent.${baseRules('COMEDY FINISH absurde et hilarant')}`;

    case 3:
      return `1. TON PROFESSIONNEL ET DRAMATIQUE : Aucun gros mot, AUCUN humour. Tu es un commentateur sportif professionnel. Style MMA/boxe pro.
2. VOCABULAIRE TECHNIQUE : Termes de combat précis (contre-attaque, esquive, uppercut, jab, garde haute). Décris les coups avec précision et tension dramatique.
3. ENJEU ÉPIQUE : Tension narrative style anime shōnen (Dragon Ball, Naruto, One Piece). Chaque round est une montée en puissance. L'histoire a un VRAI enjeu (titre, vengeance, honneur, rivalité ancienne).${baseRules('FINISHING BLOW technique et cinématographique')}`;

    case 4:
      return `1. PRIORITÉ HISTOIRE COMIQUE : C'est avant tout une HISTOIRE DRÔLE — gags, quiproquos, situations ridicules, onomatopées (SPLAT, BOING, ZING). L'humour est la COLONNE VERTÉBRALE de chaque round. Les personnages se retrouvent dans des situations comiques liées au lieu et à leurs styles improbables.
2. GROS MOTS LÉGERS EN ASSAISONNEMENT : Quelques petits gros mots autorisés et bien placés (merde, bâtard, connard, salaud, con, crétin, bordel, putain, enfoiré, abruti) — pour pimenter, JAMAIS comme moteur principal. Pas plus de 1-2 par round, et toujours dans un contexte comique. INTERDIT ABSOLU : insultes sexuelles ou crues (pute, salope, enculé, fils de pute, ta mère).
3. VANNES ET CHAMBRAGES : Les personnages se chambrent gentiment avec mordant mais l'objectif reste de FAIRE RIRE. Ça pétille, ça vanne — jamais méchant gratuit. Pense Astérix, Kaamelott, OSS 117.
4. PERSONNAGES : Exploite leur côté comique, leurs défauts amplifiés pour le fun, leurs tics verbaux poussés à l'absurde.${baseRules('SUPER COMBO drôle et un peu cinglant')}`;

    case 5:
      return `1. TON TRASH ET HUMOUR NOIR : Lâche-toi ! Gros mots autorisés (putain, merde, bâtard, salaud, bordel, connard). Trashtalk violent, cynique et humoristique. Les insultes doivent fuser et être créatives.
2. INTONATIONS ET ÉMOTIONS : Ajoute beaucoup d'expressions sonores, de cris (Aaaargh, D'oh, Grrr), d'onomatopées. Ponctuation forte (!, ?, ...) pour la synthèse vocale.
3. PERSONNAGES : Respecte les personnalités à 100% mais en version énervée et trash. L'histoire reste cohérente derrière le trash.${baseRules('FATALITY épique, absurde et violente')}`;

    case 6:
      return `1. TON HARDCORE SANS FILTRE : Tout vocabulaire autorisé sans limite. Insultes créatives au maximum, humour très noir, références adultes (alcool, cigarette, cynisme extrême). Style Tarantino ou South Park.
2. VIOLENCE GRAPHIQUE EXAGÉRÉE : Décris les coups avec exagération cartoonesque à l'extrême. Chaos total, situation hors de contrôle, humour de mauvais goût assumé.
3. PERSONNAGES : Version la plus trash et extrême de chaque personnage, leurs pires défauts amplifiés au maximum. L'histoire est CHAOTIQUE mais possède quand même un arc.${baseRules('ULTRA FATALITY tellement excessive que c\'est absurde')}`;
  }
}

export function getNarrativeModeLabel(mode: NarrativeMode): string {
  const meta = NARRATIVE_MODE_META[mode];
  return `${meta.icon} MODE ${meta.name.toUpperCase()}`;
}
