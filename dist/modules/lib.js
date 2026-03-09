// @ts-ignore
import yaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';
export const el = (css) => document.querySelector(css);
export const group = (css) => document.querySelectorAll(css);
export const create = (tagName) => document.createElement(tagName);
export const loadJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Failed to load JSON from ${url}`);
    return response.json();
};
/**
 * Lädt eine YAML-Datei und gibt den Inhalt zurück.
 */
export const loadYAML = async (url) => {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Failed to load YAML from ${url}`);
    const text = await response.text();
    return yaml.load(text);
};
