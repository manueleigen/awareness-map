import { layerDefinitions, ensureLayerBuilt, context, findAnyContextLayer } from './layers.js';
import { loadYAML, loadJSON, loadTEXT, preloadIMAGE } from './lib.js';
import { ContextLayer } from './types.js';

/**
 * Technical Implementation Guide (v2.3): Environmental Stability & Performance.
 * Centralized background preloader that handles layers, quizes, and poi data
 * without impacting the main thread during critical interactions.
 */

type PreloadTask = () => Promise<void>;
const taskQueue: PreloadTask[] = [];
let isProcessing = false;

/**
 * Schedules a task to be executed when the browser is idle.
 */
function scheduleTask(task: PreloadTask) {
    taskQueue.push(task);
    if (!isProcessing) {
        processQueue();
    }
}

async function processQueue() {
    if (taskQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const task = taskQueue.shift();
    if (task) {
        const idleSchedule = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1000));
        
        idleSchedule(async (deadline?: any) => {
            // If we have a deadline, only work if there's enough time (rough check)
            if (deadline && deadline.timeRemaining() < 5) {
                taskQueue.unshift(task); // Put back
                processQueue();
                return;
            }

            try {
                await task();
            } catch (err) {
                console.warn("[Preloader] Task failed:", err);
            }
            
            // Aggressive pause: 100ms when idle, longer if we need to let UI settle
            setTimeout(processQueue, 100);
        });
    }
}

/**
 * Main entry point for preloading.
 * Called after the initial view is rendered.
 */
export async function startBackgroundPreload() {
    console.log("[Preloader] Starting comprehensive background asset loading...");

    // 0. Preload Critical UI Assets (Highest Priority)
    const uiAssets = [
        'assets/icons/ui/esc-btn-icon.svg',
        'assets/icons/default_icon.svg'
    ];
    uiAssets.forEach(path => {
        scheduleTask(async () => {
            await loadTEXT(path);
        });
    });

    // 1. Scan Context for Icons, Quiz YAMLs & Scenario-Specific Layer Assets (High Priority)
    if (context) {
        const quizPaths = new Set<string>();
        const iconPaths = new Set<string>();
        // Using a Map to track unique sources and their associated type for preloading
        const layerAssetMap = new Map<string, string>(); 

        const scan = (layers: Record<string, ContextLayer>) => {
            Object.entries(layers).forEach(([id, l]) => {
                if (l.icon) iconPaths.add(l.icon);
                if (l.poi_icon) iconPaths.add(l.poi_icon);
                if (l.slider_icon) iconPaths.add(l.slider_icon);
                
                if (l.src) {
                    const config = layerDefinitions.find(d => d.id === id);
                    if (config) {
                        layerAssetMap.set(l.src, config.type);
                    }
                }
            });
        };

        if (context.global?.layers) scan(context.global.layers);
        
        Object.values(context.scenarios).forEach(s => {
            if (s.quiz) quizPaths.add(s.quiz);
            if (s.layers) scan(s.layers);
            Object.values(s.roles).forEach(r => {
                if (r.quiz) quizPaths.add(r.quiz);
                if (r.layers) scan(r.layers);
            });
        });

        // Schedule Icon Loads
        iconPaths.forEach(path => {
            scheduleTask(async () => {
                await loadTEXT(path);
                console.log(`[Preloader] Icon preloaded: ${path}`);
            });
        });

        // Schedule Quiz Loads
        quizPaths.forEach(path => {
            scheduleTask(async () => {
                await loadYAML(path);
                console.log(`[Preloader] Quiz preloaded: ${path}`);
            });
        });

        // Schedule Scenario-Specific Layer Assets (Exhaustive Load)
        layerAssetMap.forEach((type, src) => {
            scheduleTask(async () => {
                try {
                    if (type === 'static-image' || type === 'population-density') {
                        await preloadIMAGE(src);
                    } else if (type === 'areas' || type === 'dynamic-image') {
                        await loadTEXT(src);
                    } else if (type === 'locations') {
                        await loadJSON(src);
                    }
                    console.log(`[Preloader] Deep Preload (${type}): ${src}`);
                } catch (e) {}
            });
        });
    }

    // 2. Preload Layer DOM (Medium Priority)
    // This ensures elements exist in the DOM with their 'default' context source
    layerDefinitions.forEach(config => {
        scheduleTask(async () => {
            await ensureLayerBuilt(config.id);
        });
    });
}
