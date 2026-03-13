import { app } from './state.js';

/**
 * Initializes the dual-scaling system: 
 * - Layers (Map) use "Cover" to fill the screen (proportional).
 * - UI (Controls) use "Contain" logic for scaling factor, but the container 
 *   itself is sized to match the screen aspect ratio so edges are never cut off.
 */
export function initDualScale() {
  const layersContainer = document.getElementById('layers-container');
  const uiContainer = document.getElementById('ui-container');
  
  if (!layersContainer || !uiContainer) return;

  const baseWidth = app.width;
  const baseHeight = app.height;

  function update(): void {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    const scaleX = screenW / baseWidth;
    const scaleY = screenH / baseHeight;

    // 1. Map/Layers: Proportional "Cover"
    const scaleCover = Math.max(scaleX, scaleY);
    layersContainer!.style.transform = `translate(-50%, -50%) scale(${scaleCover})`;

    // 2. UI: Proportional scaling but dynamic container size
    // Use the smaller scale to ensure everything fits (Contain-logic)
    const scaleUI = Math.min(scaleX, scaleY);
    
    // Calculate how large the container must be at this scale to fill the screen
    const virtualWidth = screenW / scaleUI;
    const virtualHeight = screenH / scaleUI;

    uiContainer!.style.width = `${virtualWidth}px`;
    uiContainer!.style.height = `${virtualHeight}px`;
    uiContainer!.style.transform = `translate(-50%, -50%) scale(${scaleUI})`;
  }

  window.addEventListener('resize', update);
  update();
  
  return { update };
}

/**
 * Returns the current scale factor of the layers element (for coordinate mapping).
 */
export function getAppScale(): number {
    const layersContainer = document.getElementById('layers-container');
    if (!layersContainer) return 1;
    
    const style = window.getComputedStyle(layersContainer);
    const transform = style.transform;
    
    if (transform && transform !== 'none') {
        const matrix = transform.match(/^matrix\((.+)\)$/);
        if (matrix) {
            return parseFloat(matrix[1].split(', ')[0]);
        }
    }
    return 1;
}
