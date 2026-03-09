// @ts-ignore
import yaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';

export const el = <T extends HTMLElement>(css: string): T | null => document.querySelector<T>(css);
export const group = <T extends HTMLElement>(css: string): NodeListOf<T> => document.querySelectorAll<T>(css);
export const create = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] => document.createElement(tagName);

export const loadJSON = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load JSON from ${url}`);
    return response.json();
};

/**
 * Lädt eine YAML-Datei und gibt den Inhalt zurück.
 */
export const loadYAML = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load YAML from ${url}`);
    const text = await response.text();
    return yaml.load(text) as T;
};
