export const el = (css) => {
    return document.querySelector(css);
};
export const group = (css) => document.querySelectorAll(css);
export const create = (tagName) => document.createElement(tagName);
export const loadJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load JSON from ${url}: ${response.statusText}`);
    }
    return response.json();
};
export const loadTXT = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load text from ${url}: ${response.statusText}`);
    }
    return response.text();
};
