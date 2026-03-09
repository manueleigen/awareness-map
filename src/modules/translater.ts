import { app } from '../data/data.js';
import { loadJSON, group } from "./lib.js";
import { Language, Translations } from './types.js';

interface TranslatorOptions {
    persist: boolean;
    languages: Language[];
    defaultLanguage: Language;
    detectLanguage: boolean;
    filesLocation: string;
}

const defaultConfig: TranslatorOptions = {
    persist: false,
    languages: ["en"],
    defaultLanguage: "en",
    detectLanguage: false,
    filesLocation: "/i18n"
};

const cache = new Map<Language, string>();
const elements = group<HTMLElement>("[data-i18n]");

function detectLanguage(persist: boolean): Language {
    const stored = localStorage.getItem("language") as Language | null;
    if (persist && stored) return stored;

    const lang = (navigator.languages ? navigator.languages[0] : navigator.language).slice(0, 2) as Language;
    return lang;
}

async function getResource(lang: Language, filesLocation: string): Promise<Translations> {
    const cached = cache.get(lang);
    if (cached) return JSON.parse(cached);

    const translation = await loadJSON<Translations>(`${filesLocation}/${lang}.json`);
    cache.set(lang, JSON.stringify(translation));
    return translation;
}

function getValueFromJSON(key: string, json: any, options: TranslatorOptions, useFallback = true): string {
    let text = key.split(".").reduce((obj, i) => obj?.[i], json);

    if (!text && useFallback && options.defaultLanguage) {
        const fallback = JSON.parse(cache.get(options.defaultLanguage) || '{}');
        text = getValueFromJSON(key, fallback, options, false);
    }

    if (!text) {
        console.warn(`Could not find text for key "${key}".`);
        return key;
    }

    return text;
}

function applyTranslations(translation: Translations, options: TranslatorOptions): void {
    elements.forEach(element => {
        const keys = element.getAttribute("data-i18n")?.split(" ") ?? [];
        const props = element.getAttribute("data-i18n-attr")?.split(" ") ?? ["innerHTML"];

        if (keys.length !== props.length) {
            console.error("data-i18n and data-i18n-attr must have the same number of items.");
            return;
        }

        keys.forEach((key, i) => {
            const text = getValueFromJSON(key, translation, options);
            if (text) {
                (element as any)[props[i]] = text;
                element.setAttribute(props[i], text);
            }
        });
    });
}

async function load(lang: Language, options: TranslatorOptions): Promise<void> {
    if (!options.languages.includes(lang)) return;
    app.language = lang;
    const translation = await getResource(lang, options.filesLocation);
    applyTranslations(translation, options);
    document.documentElement.lang = lang;

    if (options.persist) localStorage.setItem("language", lang);
}

export function createTranslator(userOptions: Partial<TranslatorOptions> = {}) {
    const options = { ...defaultConfig, ...userOptions };

    if (options.detectLanguage) {
        options.defaultLanguage = detectLanguage(options.persist);
    }

    if (options.defaultLanguage) {
        getResource(options.defaultLanguage, options.filesLocation);
    }

    return {
        load: (lang: Language) => load(lang, options),
        getTranslationByKey: async (lang: Language, key: string) => {
            const translation = await getResource(lang, options.filesLocation);
            return getValueFromJSON(key, translation, options);
        }
    };
}
