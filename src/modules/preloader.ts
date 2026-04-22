import { layerDefinitions, ensureLayerBuilt, context, findAnyContextLayer } from './layers.js';
import { loadYAML, loadJSON, loadTEXT, preloadIMAGE } from './lib.js';
import { ContextLayer, Language } from './types.js';
import { getLoadedContext } from './context-loader.js';
import {
	validateContextYaml,
	validateLayersYaml,
	validateScenarioYaml,
	validateChallengeYaml,
	validateLocationJson,
	validateContextRelations,
	validateScenarioRelations,
	validateChallengeRelations,
	collectLayerMap,
} from './validation.js';
import {
	validateI18nContext,
	validateI18nScenario,
	validateI18nChallenge,
} from './validator-i18n.js';
import { reportValidationErrors } from './error-overlay.js';

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

    // 0. Preload Language Files (Very High Priority)
    const languages: Language[] = ['de', 'en'];
    languages.forEach(lang => {
        scheduleTask(async () => {
            await loadYAML(`/config/content.${lang}.yaml`);
            console.log(`[Preloader] Language file preloaded: ${lang}`);
        });
    });

    // 1. Preload Critical UI Assets (Highest Priority)
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
        const overlayImagePaths = new Set<string>();
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
                        if (config.type === 'pulsing-image' && (l as any).src_overlay) {
                            overlayImagePaths.add((l as any).src_overlay);
                        }
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

        // Schedule Overlay Image Loads (pulsing-image src_overlay)
        overlayImagePaths.forEach(path => {
            scheduleTask(async () => {
                await preloadIMAGE(path);
                console.log(`[Preloader] Overlay preloaded: ${path}`);
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
                    if (type === 'static-image' || type === 'population-density' || type === 'pulsing-image') {
                        await preloadIMAGE(src);
                    } else if (type === 'areas' || type === 'lottie-sequence') {
                        await loadTEXT(src);
                    } else if (type === 'locations' || type === 'svg-sequence' || type === 'png-sequence') {
                        await loadJSON(src);
                    } else {
                        console.warn(`[Preloader] No preload handler for type "${type}": ${src}`);
                        return;
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

    // 3. Phase 2: Deep validation (Low Priority, non-blocking)
    scheduleTask(async () => runDeepValidation());
}

async function runDeepValidation(): Promise<void> {
    console.log("[Validator] Starting deep validation...");
    const errors: import('./error-overlay.js').ValidationError[] = [];

    // Validate context.yaml structure
    const rawContext = getLoadedContext();
    if (rawContext) {
        errors.push(...validateContextYaml("context.yaml", rawContext));
        errors.push(...validateContextRelations("context.yaml", rawContext));
        errors.push(...validateI18nContext("context.yaml", rawContext));
    }

    // Validate layers.yaml structure
    try {
        const rawLayers = await loadYAML<unknown>("/config/layers.yaml");
        errors.push(...validateLayersYaml("layers.yaml", rawLayers));
    } catch { /* already logged by loadYAML */ }

    // Validate each scenario + challenge
    const knownLayers = rawContext ? collectLayerMap(rawContext) : new Map<string, any>();
    const scenarioIds = Object.keys(rawContext?.scenarios ?? {});

    for (const scenarioId of scenarioIds) {
        const scenarioFile = `assets/scenarios/${scenarioId}/scenario.yaml`;
        try {
            const rawScenario = await loadYAML<any>(`/${scenarioFile}`);
            if (!rawScenario) continue;

            // Skip all validation if scenario is marked inactive
            if (rawScenario.active === false) continue;

            errors.push(...validateScenarioYaml(scenarioFile, rawScenario));
            errors.push(...validateI18nScenario(scenarioFile, rawScenario));

            // Always run relational checks even when structural errors exist
            try {
                if (rawContext) {
                    errors.push(...validateScenarioRelations(
                        scenarioFile,
                        rawScenario as any,
                        scenarioId,
                        rawContext
                    ));
                }

                const roles = (rawScenario as any).roles;
                if (!roles || typeof roles !== "object" || Array.isArray(roles)) continue;
                for (const [_roleId, role] of Object.entries(roles) as [string, any][]) {
                    if (!role.challenge) continue;
                    const challengePath = role.challenge.startsWith("./")
                        ? `/assets/scenarios/${scenarioId}/${role.challenge.slice(2)}`
                        : role.challenge;
                    const challengeFile = challengePath.replace(/^\//, "");
                    try {
                        const rawChallenge = await loadYAML<unknown>(challengePath);
                        errors.push(...validateChallengeYaml(challengeFile, rawChallenge));
                        errors.push(...validateI18nChallenge(challengeFile, rawChallenge as any));
                        try {
                            errors.push(...validateChallengeRelations(
                                challengeFile,
                                rawChallenge as any,
                                knownLayers,
                            ));
                        } catch { /* structure too broken for relational checks */ }
                    } catch { /* logged by loadYAML */ }
                }
            } catch { /* structure too broken for relational checks */ }
        } catch { /* logged by loadYAML */ }
    }

    // Validate all location JSON files discovered through layer assets
    if (rawContext) {
        const layerMap = collectLayerMap(rawContext);
        for (const [id, l] of layerMap.entries()) {
            if (l.layer_type === "locations" && l.src) {
                try {
                    const rawJson = await loadJSON<unknown>(l.src);
                    errors.push(...validateLocationJson(l.src, rawJson, l));
                } catch { /* logged by loadJSON */ }
            }
        }
    }

    if (errors.length > 0) {
        console.warn(`[Validator] Found ${errors.length} issue(s).`);
        reportValidationErrors(errors);
    } else {
        console.log("[Validator] All files valid.");
    }
}
