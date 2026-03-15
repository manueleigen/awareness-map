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
 * Technical Implementation Guide (v2.3): Standardize on Pointer API.
 * This helper dispatches a "click" event on pointerup to ensure 
 * reliability on multi-touch 4K tables ("Click Booster").
 */
let lastBoostTime = 0;
export function addPointerClick(el: HTMLElement, callback: (e: PointerEvent | MouseEvent) => void): void {
    // 1. Listen for pointerup to manually boost the click
    el.addEventListener('pointerup', (e) => {
        lastBoostTime = Date.now();
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY
        });
        el.dispatchEvent(clickEvent);
    });

    // 2. Main click listener with 500ms deduplicator
    el.addEventListener('click', (e) => {
        // If the browser fires a trusted click shortly after our booster, ignore it.
        if (Date.now() - lastBoostTime < 500 && e.isTrusted) {
            e.stopImmediatePropagation();
            return;
        }
        callback(e as PointerEvent);
    });

    // 3. Visual "Active" states on pointerdown for responsiveness
    el.addEventListener('pointerdown', (e) => {
        // Technical Implementation Guide (v2.3): Component Hardening
        // Keeps the interaction attached to the element even if the finger drifts.
        try { el.setPointerCapture(e.pointerId); } catch(err) {}
        el.classList.add('is-pressing');
    });

    // Ensure feedback state is removed on release or cancel
    const removeFeedback = () => el.classList.remove('is-pressing');
    el.addEventListener('pointerup', removeFeedback);
    el.addEventListener('pointercancel', removeFeedback);
    el.addEventListener('pointerleave', removeFeedback);
    }