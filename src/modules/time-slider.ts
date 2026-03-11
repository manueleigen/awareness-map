import { create } from './lib.js';
import { LayerConfig, ContextLayer } from './types.js';

/**
 * Helper to wait for the dotLottie instance to be fully initialized and loaded.
 */
export function waitForPlayerReady(player: any): Promise<any> {
    return new Promise((resolve) => {
        const check = () => {
            if (player.dotLottie && player.dotLottie.isLoaded) {
                resolve(player.dotLottie);
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

/**
 * Builds a dynamic time slider for layers with playback_control.
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
    iconImg.src = ctxLayer?.slider_icon || ctxLayer?.icon || '/assets/icons/default_icon.svg';
    iconImg.onerror = () => { iconImg.src = '/assets/icons/default_icon.svg'; };
    thumbIcon.append(iconImg);

    container.append(range, thumbIcon);

    const labels = create('div');
    labels.className = 'slider-label-container';
    
    const timeSteps = calculateTimeSteps(config.start_time || '00:00', config.end_time || '24:00');
    timeSteps.forEach(time => {
        const lbl = create('label');
        lbl.innerText = time;
        labels.append(lbl);
    });

    sliderWrapper.append(container, labels);

    // Performance Optimization: Throttle updates using requestAnimationFrame
    let ticking = false;
    let cachedCore: any = null;
    let cachedWidth: number = 0;

    const performUpdate = () => {
        const val = parseFloat(range.value);
        
        // 1. Update Lottie
        if (cachedCore) {
            if (typeof cachedCore.setFrame === 'function') {
                const totalFrames = cachedCore.totalFrames || 100;
                cachedCore.setFrame((val / 100) * totalFrames);
            } else if (typeof cachedCore.seek === 'function') {
                cachedCore.seek(val);
            }
            // Only call pause if it's actually playing to save cycles
            if (cachedCore.isPlaying) cachedCore.pause();
        }

        // 2. Update UI (Thumb)
        if (cachedWidth === 0) cachedWidth = range.offsetWidth || 1380;
        updateThumbPosition(range, thumbIcon, cachedWidth);
        
        ticking = false;
    };

    range.addEventListener('input', () => {
        if (!ticking) {
            requestAnimationFrame(performUpdate);
            ticking = true;
        }
    });

    // Reset cached width on window resize
    window.addEventListener('resize', () => { cachedWidth = 0; });

    // Initial load of the Lottie core
    const player = document.getElementById(`player-${config.id}`) as any;
    if (player) {
        waitForPlayerReady(player).then(core => {
            cachedCore = core;
            performUpdate(); // Sync initial state
        }).catch(() => {});
    }

    return sliderWrapper;
}

/**
 * Calculates sensible full-hour time steps between start and end time.
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
        if (diff / candidate <= 5) break;
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
 * Calculates and updates the custom thumb icon position.
 * @param width Optional pre-calculated width to avoid layout thrashing
 */
export function updateThumbPosition(range: HTMLInputElement, thumbIcon: HTMLElement, width?: number) {
    const val = parseFloat(range.value);
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    const percent = (val - min) / (max - min);
    
    const trackWidth = width || range.offsetWidth || 1380;
    const thumbWidth = 90;
    const padding = thumbWidth / 2;
    const usableWidth = trackWidth - thumbWidth;
    const thumbPos = (percent * usableWidth) + padding;
    
    thumbIcon.style.left = `${thumbPos}px`;
}
