import { create } from './lib.js';
import { LayerConfig, ContextLayer } from './types.js';

/**
 * Helper to wait for the dotLottie instance to be fully initialized and loaded.
 * Necessary because the Web Component initializes asynchronously.
 */
export function waitForPlayerReady(player: any): Promise<any> {
    return new Promise((resolve) => {
        const check = () => {
            if (player.dotLottie && player.dotLottie.isLoaded) {
                resolve(player.dotLottie);
            } else {
                // Poll every 50ms until ready
                setTimeout(check, 50);
            }
        };
        check();
    });
}

/**
 * Builds a dynamic time slider UI for layers with playback_control enabled.
 * Integrates with dotLottie players to control animation frames.
 */
export function buildSlider(config: LayerConfig, ctxLayer: ContextLayer | null): HTMLElement {
    const sliderWrapper = create('div');
    sliderWrapper.className = 'slider-wrapper';
    sliderWrapper.id = `slider-wrapper-${config.id}`;

    const container = create('div');
    container.className = 'slider-container';

    const range = create('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.value = '0';
    range.className = 'range-slider';
    range.id = `slider-${config.id}`;

    const thumbIcon = create('div');
    thumbIcon.className = 'slider-thumb-icon';
    const iconImg = create('img');
    // Priority: slider_icon > poi_icon > fallback
    iconImg.src = ctxLayer?.slider_icon || ctxLayer?.poi_icon || '/assets/icons/default_icon.svg';
    iconImg.onerror = () => { iconImg.src = '/assets/icons/default_icon.svg'; };
    thumbIcon.append(iconImg);

    container.append(range, thumbIcon);

    // Technical Implementation Guide (v2.3): Component Hardening
    // 1. Jump-to-Tap: Attach the pointerdown listener to the Slider Container (the track).
    // This allows users to set a value instantly by tapping anywhere on the bar.
    container.addEventListener('pointerdown', (e) => {
        const rect = range.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, offsetX / rect.width));
        const min = parseFloat(range.min);
        const max = parseFloat(range.max);
        const val = (percent * (max - min)) + min;
        
        range.value = val.toString();
        
        // 2. Pointer Capture: Keeps the slider attached to the finger even if it slides far off-track.
        try { range.setPointerCapture(e.pointerId); } catch(err) {}

        if (cachedCore?.isPlaying) cachedCore.pause();

        performUpdate();
    });

    // Generate time labels (e.g., 08:00, 12:00...)
    const labels = create('div');
    labels.className = 'slider-label-container';
    
    const timeSteps = calculateTimeSteps(config.start_time || '00:00', config.end_time || '24:00');
    timeSteps.forEach(time => {
        const lbl = create('label');
        lbl.innerText = time;
        labels.append(lbl);
    });

    sliderWrapper.append(container, labels);

    let lottieTicking = false;
    let cachedCore: any = null;
    let cachedWidth: number = 0;

    const syncThumb = () => {
        if (cachedWidth === 0) cachedWidth = range.offsetWidth || 1380;
        updateThumbPosition(range, thumbIcon, cachedWidth);
    };

    const syncLottieFrame = () => {
        if (cachedCore) {
            const val = parseFloat(range.value);
            if (typeof cachedCore.setFrame === 'function') {
                const totalFrames = cachedCore.totalFrames || 100;
                cachedCore.setFrame(Math.round((val / 100) * totalFrames));
            } else if (typeof cachedCore.seek === 'function') {
                cachedCore.seek(val);
            }
        }
        lottieTicking = false;
    };

    const performUpdate = () => {
        syncThumb();
        if (!lottieTicking) {
            requestAnimationFrame(syncLottieFrame);
            lottieTicking = true;
        }
    };

    range.addEventListener('input', () => {
        syncThumb();
        if (!lottieTicking) {
            requestAnimationFrame(syncLottieFrame);
            lottieTicking = true;
        }
    });

    // Handle layout changes
    window.addEventListener('resize', () => { cachedWidth = 0; });

    // Link slider to its corresponding Lottie player
    const player = document.getElementById(`player-${config.id}`) as any;
    if (player) {
        waitForPlayerReady(player).then(core => {
            cachedCore = core;
            if (core.isPlaying) core.pause();
            performUpdate();
        }).catch(() => {});
    }

    return sliderWrapper;
}

/**
 * Calculates human-readable time steps for the slider labels.
 * Automatically chooses a "nice" step interval (1h, 2h, 4h, etc.) to avoid crowding.
 */
function calculateTimeSteps(start: string, end: string): string[] {
    const parseH = (t: string) => parseInt(t.split(':')[0], 10);
    const formatH = (h: number) => `${h.toString().padStart(2, '0')}:00`;

    const s = parseH(start);
    const e = parseH(end);
    const diff = e - s;

    if (diff <= 0) return [formatH(s)];

    const niceSteps = [1, 2, 3, 4, 6, 12];
    let step = 1;
    for (const candidate of niceSteps) {
        step = candidate;
        if (diff / candidate <= 5) break; // Aim for max 5-6 labels
    }

    const labels: string[] = [];
    for (let h = s; h < e; h += step) {
        labels.push(formatH(h));
    }
    const lastLabel = formatH(e);
    if (labels[labels.length - 1] !== lastLabel) {
        labels.push(lastLabel);
    }
    return labels;
}

/**
 * Calculates and updates the custom thumb icon's CSS position.
 */
export function updateThumbPosition(range: HTMLInputElement, thumbIcon: HTMLElement, width?: number) {
    const val = parseFloat(range.value);
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    const percent = (val - min) / (max - min);
    
    const trackWidth = width || range.offsetWidth || 1380;
    const thumbWidth = 90; // Size defined in SCSS
    const usableWidth = trackWidth - thumbWidth;
    const thumbPos = percent * usableWidth;
    
    thumbIcon.style.transform = `translate(${thumbPos}px, -50%)`;
}
