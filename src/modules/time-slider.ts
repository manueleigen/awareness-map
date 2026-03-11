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
    
    // Dynamic labels based on start_time and end_time with sensible hour steps
    const timeSteps = calculateTimeSteps(config.start_time || '00:00', config.end_time || '24:00');
    timeSteps.forEach(time => {
        const lbl = create('label');
        lbl.innerText = time;
        labels.append(lbl);
    });

    sliderWrapper.append(container, labels);

    range.addEventListener('input', () => {
        const player = document.getElementById(`player-${config.id}`) as any;
        if (!player) return;

        const update = (core: any) => {
            const val = parseFloat(range.value);
            if (typeof core.setFrame === 'function') {
                const totalFrames = core.totalFrames || 100;
                core.setFrame((val / 100) * totalFrames);
            } else if (typeof core.seek === 'function') {
                core.seek(val);
            }
            core.pause();
        };

        if (player.dotLottie && player.dotLottie.isLoaded) {
            update(player.dotLottie);
        } else {
            waitForPlayerReady(player).then(update).catch(() => {});
        }
        updateThumbPosition(range, thumbIcon);
    });

    // Initial positioning after DOM attachment
    setTimeout(() => updateThumbPosition(range, thumbIcon), 100);
    
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

    // Sensible steps for hours
    const niceSteps = [1, 2, 3, 4, 6, 12];
    let step = 1;
    
    // Pick a step that results in roughly 4-6 labels
    for (const candidate of niceSteps) {
        step = candidate;
        if (diff / candidate <= 5) break;
    }

    const labels: string[] = [];
    for (let h = s; h < e; h += step) {
        labels.push(formatH(h));
    }
    
    // Always ensure the exact end hour is included
    const lastLabel = formatH(e);
    if (labels[labels.length - 1] !== lastLabel) {
        labels.push(lastLabel);
    }

    return labels;
}

/**
 * Calculates and updates the custom thumb icon position.
 */
export function updateThumbPosition(range: HTMLInputElement, thumbIcon: HTMLElement) {
    const val = parseFloat(range.value);
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    const percent = (val - min) / (max - min);
    
    const width = range.offsetWidth || 1380;
    const thumbWidth = 90;
    const padding = thumbWidth / 2;
    const usableWidth = width - thumbWidth;
    const thumbPos = (percent * usableWidth) + padding;
    
    thumbIcon.style.left = `${thumbPos}px`;
}
