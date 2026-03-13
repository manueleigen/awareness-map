// @ts-ignore
import yaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';

/** Shorthand for document.querySelector */
export const el = <T extends HTMLElement>(css: string): T | null => document.querySelector<T>(css);

/** Shorthand for document.querySelectorAll */
export const group = <T extends HTMLElement>(css: string): NodeListOf<T> => document.querySelectorAll<T>(css);

/** Shorthand for document.createElement */
export const create = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] => document.createElement(tagName);

/** Loads a JSON file and returns its parsed content. */
export const loadJSON = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load JSON from ${url}`);
    return response.json();
};

/**
 * Loads a YAML file and returns its parsed content as an object.
 */
export const loadYAML = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load YAML from ${url}`);
    const text = await response.text();
    return yaml.load(text) as T;
};

/** Loads a plain text file (e.g. SVG source). */
export const loadTEXT = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load TEXT from ${url}`);
    const text = await response.text();
    return text as T;
};