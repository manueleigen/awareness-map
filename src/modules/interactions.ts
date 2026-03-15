/**
 * Technical Implementation Guide (v2.3): Standardize on Pointer API.
 * This helper dispatches a "click" event on pointerup to ensure 
 * reliability on multi-touch 4K tables ("Click Booster").
 */
let lastBoostTime = 0;

/**
 * Standardizes click behavior for multi-user touch tables.
 * Dispatches a manual "click" on pointerup to bypass browser-specific touch-click suppression.
 */
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
