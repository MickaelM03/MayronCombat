import { MsEdgeTTS } from 'msedge-tts';
const tts = new MsEdgeTTS();
tts.getVoices().then(voices => {
  console.log(voices.filter(v => v.Locale.startsWith('fr-FR')).map(v => v.ShortName));
});
