import { app } from '../data/data.js';
import { loadYAML, group } from "./lib.js";
let content = null;
export async function initTranslator(lang) {
    app.language = lang;
    content = await loadYAML(`/config/content.${lang}.yaml`);
    applyDOMTranslations();
    document.documentElement.lang = lang;
}
/**
 * Translates a key using the loaded YAML content.
 * Supports nested keys like "home.headline".
 * @param key The translation key
 * @param fallback The value to return if key is not found (optional)
 */
export function t(key, fallback) {
    if (!content)
        return fallback ?? key;
    const value = key.split('.').reduce((obj, i) => obj?.[i], content);
    if (typeof value !== 'string') {
        if (!fallback)
            console.warn(`Translation key not found or not a string: ${key}`);
        return fallback ?? key;
    }
    return value;
}
/**
 * Automatically translates all elements with [data-i18n].
 */
function applyDOMTranslations() {
    const elements = group("[data-i18n]");
    elements.forEach(element => {
        const key = element.getAttribute("data-i18n");
        if (key) {
            element.innerHTML = t(key);
        }
        // Handle attributes like data-i18n-placeholder
        const attrKey = element.getAttribute("data-i18n-attr");
        if (attrKey) {
            const [attr, translationKey] = attrKey.split(':');
            element.setAttribute(attr, t(translationKey));
        }
    });
}
export async function setLanguage(lang) {
    await initTranslator(lang);
}
