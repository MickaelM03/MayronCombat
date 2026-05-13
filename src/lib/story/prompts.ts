import { NarrativeMode } from '../battles/prompts';

export function getStoryDirectives(
  mode: NarrativeMode,
  characterNames: string[],
  arenaName: string,
  theme: string,
  isInteractive: boolean,
  previousContext?: string
): string {
  const charactersList = characterNames.join(', ');
  
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
  ${isInteractive ? ', "choices": [ { "text": "Texte du choix pour le lecteur", "action": "Résumé court de la direction choisie" } ], "isEnd": boolean' : ', "isEnd": true'}
}
5. FIN : Si l'histoire arrive à sa conclusion naturelle, mets "isEnd": true et ne propose pas de choix.
6. TTS : Chaque valeur de "text" DOIT commencer par "Nom: ". Exemple : "Homer Simpson: Oh punaise, j'ai faim !". Si c'est le narrateur : "Narrateur: L'aventure commence...".
`;

  const modeDirectives = {
    1: "Mode FAMILLE : Pas de violence, pas de gros mots, ton bienveillant et magique. Style conte pour enfants.",
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
    ? `\n7. CONTEXTE PRÉCÉDENT : Voici ce qui s'est passé avant :\n${previousContext}\nCONTINUE l'histoire à partir de là en tenant compte du dernier choix effectué.`
    : `\n7. DÉBUT : C'est le début de l'histoire. Pose le cadre et lance l'intrigue immédiatement.`;

  return `${baseRules}\n${modeDirectives}\n${interactiveRules}\n${contextPrompt}`;
}

export interface StoryChapterJSON {
  title?: string;
  lines: { speaker: string; text: string; action?: string }[];
  choices?: { text: string; action: string }[];
  isEnd?: boolean;
}
