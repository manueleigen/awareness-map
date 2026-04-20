// @ts-ignore
import yaml from './vendor/js-yaml.js';

/** Shorthand for document.querySelector */
export const el = <T extends HTMLElement>(css: string): T | null => document.querySelector<T>(css);

/** Shorthand for document.querySelectorAll */
export const group = <T extends HTMLElement>(css: string): NodeListOf<T> => document.querySelectorAll<T>(css);

/** Shorthand for document.createElement */
export const create = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] => document.createElement(tagName);

const cache = new Map<string, Promise<any>>();

function logPath(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts.length >= 2 ? parts.slice(-2).join('/') : parts[parts.length - 1] ?? url;
}

/** Loads a JSON file and returns its parsed content (cached). */
export const loadJSON = <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url)!;
    const promise = (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load JSON from ${url}`);
        const data = await response.json();
        console.log(`[JSON] ${logPath(url)} fetched`);
        return data as T;
    })();
    cache.set(url, promise);
    return promise;
};

/**
 * Loads a YAML file and returns its parsed content as an object (cached).
 */
export const loadYAML = <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url)!;
    const promise = (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load YAML from ${url}`);
        const text = await response.text();
        const data = yaml.load(text) as T;
        console.log(`[YAML] ${logPath(url)} fetched`);
        return data;
    })();
    cache.set(url, promise);
    return promise;
};

/** Loads a plain text file (e.g. SVG source) (cached). */
export const loadTEXT = <T>(url: string): Promise<T> => {
    if (cache.has(url)) return cache.get(url)!;
    const promise = (async () => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load TEXT from ${url}`);
        const text = await response.text();
        console.log(`[TEXT] ${logPath(url)} fetched`);
        return text as any as T;
    })();
    cache.set(url, promise);
    return promise;
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

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));