export const el = <T extends HTMLElement>(css: string): T | null => {
    return document.querySelector<T>(css);
}
export const group = <T extends HTMLElement>(css: string): NodeListOf<T> => document.querySelectorAll<T>(css);

export const create = <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] => document.createElement(tagName);
export const loadJSON = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load JSON from ${url}: ${response.statusText}`);
    }
    return response.json();
};
export const loadTXT = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load text from ${url}: ${response.statusText}`);
    }
    return response.text();
};
