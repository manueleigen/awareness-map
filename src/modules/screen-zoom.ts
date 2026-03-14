import { app } from './state.js';

/**
 * Initializes the dual-scaling system optimized for 4K touch-tables.
 * 
 * - Layers (Map): Use "Cover" scaling (Math.max) to ensure the background 
 *   always fills the entire screen without black bars.
 * - UI (Controls): Use "Proportional dynamic" scaling. The container size 
 *   is recalculated to match the actual screen aspect ratio, ensuring that 
 *   elements pinned to edges (e.g., bottom: 60px) stay at the physical edges.
 */
export function initDualScale() {
  const layersContainer = document.getElementById('layers-container');
  const uiContainer = document.getElementById('ui-container');
  
  if (!layersContainer || !uiContainer) return;

  const baseWidth = app.width;   // Native width: 3840
  const baseHeight = app.height; // Native height: 2160

  /**
   * Recalculates transformation matrices and container dimensions.
   */
  function update(): void {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    const scaleX = screenW / baseWidth;
    const scaleY = screenH / baseHeight;

    // 1. Map/Layers: Proportional "Cover" scaling
    const scaleCover = Math.max(scaleX, scaleY);
    layersContainer!.style.transform = `translate(-50%, -50%) scale(${scaleCover})`;

    // 2. UI: Proportional scaling with dynamic container expansion
    // Use the smaller scale factor to ensure all UI elements remain within the viewport
    const scaleUI = Math.min(scaleX, scaleY);
    
    // Expand the virtual size of the UI container so it stretches to the real screen edges
    const virtualWidth = screenW / scaleUI;
    const virtualHeight = screenH / scaleUI;

    uiContainer!.style.width = `${virtualWidth}px`;
    uiContainer!.style.height = `${virtualHeight}px`;
    uiContainer!.style.transform = `translate(-50%, -50%) scale(${scaleUI})`;
  }

  window.addEventListener('resize', update);
  update(); // Initial calculation
  
  return { update };
}

/**
 * Returns the current scale factor of the map layers.
 * Essential for mapping screen-space mouse/touch coordinates back to 
 * the native coordinate system (3840x2160).
 */
export function getAppScale(): number {
    const layersContainer = document.getElementById('layers-container');
    if (!layersContainer) return 1;
    
    const style = window.getComputedStyle(layersContainer);
    const transform = style.transform;
    
    if (transform && transform !== 'none') {
        // Extract scale from CSS matrix(a, b, c, d, tx, ty)
        const matrix = transform.match(/^matrix\((.+)\)$/);
        if (matrix) {
            return parseFloat(matrix[1].split(', ')[0]);
        }
    }
    return 1;
}
