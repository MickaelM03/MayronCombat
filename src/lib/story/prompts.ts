import { NarrativeMode } from '../battles/prompts';

export function getStoryDirectives(
  mode: NarrativeMode,
  characterNames: string[],
  arenaName: string,
  theme: string,
  isInteractive: boolean,
  previousContext?: string,
  inventory?: { heroId?: string, items: string[], allies: string[] },
  chapterCount: number = 0
): string {
  const charactersList = characterNames.join(', ');
  const isMaPremiereAventure = theme.includes('Ma Première Aventure');

  // Identification du héros actuel
  const currentHero = inventory?.heroId ? characterNames.find(n => inventory.heroId === n) || inventory.heroId : "Non défini";
  
  const baseRules = `
1. PERSONNAGES : Les personnages présents sont : ${charactersList}. Respecte scrupuleusement leurs personnalités, tics de langage et univers respectifs.
2. LIEU : L'histoire se déroule à : ${arenaName}. Utilise le décor pour enrichir la narration.
3. THÈME : Le thème de cette chronique est : ${theme}.
4. FORMAT JSON : Réponds UNIQUEMENT par un objet JSON valide suivant cette structure :
{
  "title": "Titre de l'histoire (uniquement au premier chapitre)",
  "lines": [
    { "speaker": "Nom du Personnage ou Narrateur", "text": "Nom: Dialogue ou Narration", "action": "Action courte" }
  ]
  ${isInteractive ? ', "choices": [ { "text": "Texte du choix", "action": "Direction", "inventoryUpdate": { "type": "ITEM|ALLY", "name": "Nom" } } ], "isEnd": boolean' : ', "isEnd": true'}
}
5. INVENTAIRE : Si le joueur fait un choix qui mérite un objet ou un allié, ajoute un champ "inventoryUpdate" dans le choix.
6. TTS : Chaque valeur de "text" DOIT commencer par "Nom: ".
7. COHÉRENCE NARRATIVE : L'histoire doit suivre une progression logique. Chaque chapitre doit s'appuyer sur le contexte précédent.
8. PERSISTANCE ET ÉCHEC : Un mauvais choix ne doit JAMAIS mener à une fin prématurée ou une défaite définitive ("isEnd": true). L'échec doit toujours créer une nouvelle péripétie, un détour ou une épreuve supplémentaire. L'histoire continue jusqu'à une résolution positive.
9. CONCLUSION ET MORALITÉ : Le chapitre final ("isEnd": true) doit être BEAUCOUP PLUS LONG (10-15 lignes). Il doit offrir une conclusion riche et se terminer par une moralité claire liée au thème (amitié, courage, sagesse, etc.).
`;

  const mpaRules = isMaPremiereAventure ? `
7. RÈGLES MA PREMIÈRE AVENTURE (IMPÉRATIF) : 
- STRUCTURE : Cette aventure suit un format livre-jeu. 
- PHASE 1 (Héros) : Déjà accomplie. Le héros est ${currentHero}.
- PHASE 2 (Équipement) : Si c'est le TOUT PREMIER choix (choix du héros), le chapitre suivant DOIT proposer au joueur de choisir UN objet parmi 3 choix distincts. Chaque choix DOIT avoir un "inventoryUpdate" de type "ITEM".
- PHASE 3 (Aventure) : Chaque chapitre DOIT se terminer par un choix binaire ou ternaire (champ "choices").
- OBLIGATION DE CHOIX : Ne termine JAMAIS un chapitre sans proposer de nouveaux choix dans le champ "choices", sauf si "isEnd" est true.
- INVENTAIRE : Objets possédés: [${inventory?.items?.join(', ') || 'Aucun'}].
- UTILISATION DES OBJETS : Propose parfois des choix utilisant les objets possédés.
- DÉNOUEMENT : Plusieurs étapes avant le grand final.` : "";

  const modeDirectives = {
    1: isMaPremiereAventure 
       ? "Mode ENFANT (Ma Première Aventure) : Ton extrêmement doux, magique et pédagogique. Vocabulaire simple (4-9 ans). Pas de violence du tout. L'enfant doit se sentir comme le héros d'un livre de conte."
       : "Mode FAMILLE : Pas de violence, pas de gros mots, ton bienveillant et magique. Style conte pour enfants.",
    2: "Mode COMIQUE : Humour absurde, situations ridicules, gags visuels décrits par le narrateur. Style cartoon.",
    3: "Mode SÉRIEUX : Ton dramatique, épique, enjeux élevés, style roman d'aventure sérieux ou thriller.",
    4: "Mode LÉGER : Ton familier, taquineries, un peu de piquant mais reste gentil et divertissant.",
    5: "Mode TRASH : Humour noir, gros mots créatifs, situations cyniques et décalées. Style déjanté.",
    6: "Mode HARDCORE : Sans filtre, trash extrême, style South Park / Tarantino. Dialogue percutant et situations chaotiques.",
  }[mode];

  const interactiveRules = isInteractive 
    ? `6. INTERACTIVITÉ : Tu es dans un mode "Livre dont vous êtes le héros". Termine TOUJOURS ce chapitre par exactement 2 ou 3 choix cruciaux pour le lecteur dans le champ "choices".
       ${chapterCount >= 5 ? 'AVERTISSEMENT : L\'histoire dure depuis un moment. Prépare la conclusion.' : ''}
       ${chapterCount >= 8 ? 'URGENT : C\'est le DERNIER CHAPITRE. Tu DOIS terminer l\'histoire ici en mettant "isEnd": true.' : ''}`
    : `6. LINÉAIRE : Raconte une histoire complète et structurée (début, milieu, fin). Pour le chapitre final, génère 15-20 lignes de dialogue/narration avec une moralité.`;

  const contextPrompt = previousContext 
    ? `\n${isMaPremiereAventure ? '9' : '8'}. CONTEXTE PRÉCÉDENT : Voici ce qui s'est passé avant :\n${previousContext}\nCONTINUE l'histoire à partir de là en tenant compte du dernier choix effectué.`
    : `\n${isMaPremiereAventure ? '9' : '8'}. DÉBUT : C'est le début de l'histoire. Pose le cadre et lance l'intrigue immédiatement.`;

  const dragonSpecificRules = theme.includes('En quête du Dragon') ? `
10. RÈGLES SPÉCIFIQUES "EN QUÊTE DU DRAGON" :
- OBJECTIF : Le but ultime est d'APPRIVOISER le dragon, JAMAIS de le tuer ou de le blesser. Toute tentative de violence doit être découragée par le narrateur ou mener à un détour narratif.
- PERSISTANCE : L'histoire ne doit PAS se terminer par un échec définitif. Si le joueur fait un mauvais choix (ex: effrayer le dragon), l'histoire continue : le dragon s'enfuit plus loin, et le héros doit trouver un nouveau moyen (nourriture, musique, patience, aide d'un allié) pour le retrouver et gagner sa confiance.
- CONCLUSION ET MORALITÉ : Lorsque le joueur réussit enfin à apprivoiser le dragon (ce qui doit arriver après plusieurs étapes), le chapitre final ("isEnd": true) doit être BEAUCOUP PLUS LONG. Génère au moins 10 à 15 lignes de dialogue et narration pour ce dénouement.
- FINALE : La conclusion doit raconter le lien spécial qui unit désormais le héros et le dragon, et se terminer par une moralité explicite sur la patience, l'empathie ou le respect de la nature.
` : "";

  return `${baseRules}\n${modeDirectives}\n${mpaRules}\n${interactiveRules}\n${contextPrompt}\n${dragonSpecificRules}`;
}

export interface StoryChapterJSON {
  title?: string;
  lines: { 
    speaker: string; 
    text: string; 
    action?: string;
    choices?: { text: string; action: string; inventoryUpdate?: { type: 'ITEM' | 'ALLY', name: string } }[];
  }[];
  choices?: { text: string; action: string; inventoryUpdate?: { type: 'ITEM' | 'ALLY', name: string } }[];
  isEnd?: boolean;
}
