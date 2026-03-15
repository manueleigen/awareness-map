// @ts-ignore
import yaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';

/** Shorthand for document.querySelector */
export const el = <T extends HTMLElement>(css: string): T | null => document.querySelector<T>(css);

/** Shorthand for document.querySelectorAll */
export const group = <T extends HTMLElement>(css: string): NodeListOf<T> => document.querySelectorAll<T>(css);

/** Shorthand for document.createElement */
export const create = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] => document.createElement(tagName);

const cache = new Map<string, any>();

/** Loads a JSON file and returns its parsed content (cached). */
export const loadJSON = async <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load JSON from ${url}`);
    const data = await response.json();
    cache.set(url, data);
    console.log(`[JSON] ${url.split('/').pop()} fetched`);
    return data;
};

/**
 * Loads a YAML file and returns its parsed content as an object (cached).
 */
export const loadYAML = async <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load YAML from ${url}`);
    const text = await response.text();
    const data = yaml.load(text) as T;
    cache.set(url, data);
    console.log(`[YAML] ${url.split('/').pop()} fetched`);
    return data;
};

/** Loads a plain text file (e.g. SVG source) (cached). */
export const loadTEXT = async <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load TEXT from ${url}`);
    const text = await response.text();
    cache.set(url, text);
    console.log(`[SVG] ${url.split('/').pop()} fetched`);
    return text as any;
};

/**
 * Preloads an image by creating an Image object.
 */
export const preloadIMAGE = (url: string): Promise<void> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't block queue on fail
        img.src = url;
    });
};