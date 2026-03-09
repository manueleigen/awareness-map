import { initLayers }  from "../modules/layers.js";
import { createTranslator } from "../modules/translater.js";


const translator = createTranslator({
  languages: ["de", "en"],
  filesLocation: "/i18n"
});


translator.load("en");



initLayers()