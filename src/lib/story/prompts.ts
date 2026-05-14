import { NarrativeMode } from '../battles/prompts';

export function getStoryDirectives(
  mode: NarrativeMode,
  characterNames: string[],
  arenaName: string,
  theme: string,
  isInteractive: boolean,
  previousContext?: string,
  inventory?: { heroId?: string, items: string[], allies: string[] }
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
7. COHÉRENCE NARRATIVE : L'histoire doit suivre une progression logique. Chaque chapitre doit s'appuyer sur le contexte précédent pour construire une intrigue riche et cohérente.
8. ÉCHEC ET RÉUSSITE : Le joueur ne gagne pas automatiquement. Ses choix doivent avoir des conséquences réelles. Une mauvaise décision peut mener à un échec (ex: perdre la trace du dragon, se perdre dans la forêt) ou à une fin prématurée ("isEnd": true).
`;

  const mpaRules = isMaPremiereAventure ? `
7. RÈGLES MA PREMIÈRE AVENTURE : 
- STRUCTURE : Cette aventure suit un format livre-jeu. 
- PHASE 1 (Héros) : Déjà accomplie. Le héros est ${currentHero}.
- PHASE 2 (Équipement) : Si c'est le TOUT PREMIER choix (choix du héros), le chapitre suivant DOIT proposer au joueur de choisir UN objet parmi 3 choix distincts. Chaque choix DOIT avoir un "inventoryUpdate" de type "ITEM".
- PHASE 3 (Aventure) : Une fois l'objet choisi, l'aventure continue. Chaque chapitre doit se terminer par un choix binaire ou ternaire.
- OBLIGATION ABSOLUE : Tu DOIS TOUJOURS inclure le champ "choices" (liste d'objets) à la fin de chaque réponse, sauf si "isEnd" est true. Ne jamais laisser l'histoire sans choix.
- INVENTAIRE : Objets possédés: [${inventory?.items?.join(', ') || 'Aucun'}]. Propose des objets différents de ceux déjà possédés.
- UTILISATION DES OBJETS : Les choix proposés doivent parfois dépendre des objets possédés dans l'inventaire (ex: "Utiliser l'objet [Nom] pour résoudre la situation").
- ÉVITE LA RÉPÉTITION : Ne répète pas les questions précédentes.
- DÉNOUEMENT : L'aventure doit comporter plusieurs étapes (rencontres, obstacles, énigmes) avant d'arriver au grand final (ex: le face-à-face avec le dragon).` : "";

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
    ? `6. INTERACTIVITÉ : Tu es dans un mode "Livre dont vous êtes le héros". Termine TOUJOURS ce chapitre par exactement 2 ou 3 choix cruciaux pour le lecteur dans le champ "choices".`
    : `6. LINÉAIRE : Raconte une histoire complète et structurée (début, milieu, fin) en environ 15-20 lignes de dialogue/narration.`;

  const contextPrompt = previousContext 
    ? `\n${isMaPremiereAventure ? '9' : '8'}. CONTEXTE PRÉCÉDENT : Voici ce qui s'est passé avant :\n${previousContext}\nCONTINUE l'histoire à partir de là en tenant compte du dernier choix effectué.`
    : `\n${isMaPremiereAventure ? '9' : '8'}. DÉBUT : C'est le début de l'histoire. Pose le cadre et lance l'intrigue immédiatement.`;

  return `${baseRules}\n${modeDirectives}\n${mpaRules}\n${interactiveRules}\n${contextPrompt}`;
}

export interface StoryChapterJSON {
  title?: string;
  lines: { speaker: string; text: string; action?: string }[];
  choices?: { text: string; action: string }[];
  isEnd?: boolean;
}
