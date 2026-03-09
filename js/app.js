import { initLayers }  from "../modules/layers.js";
import { createTranslator, toggleLanguage } from "../modules/translater.js";
import { app } from "../data/data.js";

const translator = createTranslator({
  languages: ["de", "en"],
  filesLocation: "/i18n"
});


translator.load(app.language);

console.log(app.language)
console.log("app.language")

el('#language-switch .switch').addEventListener('click', toggleLanguage)

initLayers()