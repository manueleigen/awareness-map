import { app } from './state.js';



export interface CoverScaleOptions {
  /** The element to scale. Defaults to `#app`. */
  element?: HTMLElement;
  /** Native width of the element in px. Defaults to 3840. */
  baseWidth?: number;
  /** Native height of the element in px. Defaults to 2160. */
  baseHeight?: number;
  /** Called after every scale update with the new scale factor. */
  onScale?: (scale: number) => void;
}

export interface CoverScaleInstance {
  /** Recalculate and apply the scale immediately. */
  update: () => void;
  /** Remove the resize listener and stop automatic scaling. */
  destroy: () => void;
  /** Return the last computed scale factor. */
  getScale: () => number;
}

export function initCoverScale(options: CoverScaleOptions = {}): CoverScaleInstance {
  const {
    element = document.getElementById('app') as HTMLElement,
    baseWidth = app.width,
    baseHeight = app.height,
    onScale,
  } = options;

  if (!element) {
    throw new Error('[coverScale] Target element not found.');
  }

  let currentScale = 1;

  function update(): void {
    const scaleX = window.innerWidth  / baseWidth;
    const scaleY = window.innerHeight / baseHeight;
    currentScale = Math.max(scaleX, scaleY);

    element.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
    onScale?.(currentScale);
  }

  function destroy(): void {
    window.removeEventListener('resize', update);
  }

  function getScale(): number {
    return currentScale;
  }

  // Apply required positioning styles if not already set via CSS
  element.style.position   = 'absolute';
  element.style.top        = '50%';
  element.style.left       = '50%';
  element.style.width      = `${baseWidth}px`;
  element.style.height     = `${baseHeight}px`;
  element.style.transformOrigin = 'center center';

  window.addEventListener('resize', update);
  update();

  return { update, destroy, getScale };
}