#!/usr/bin/env node
/**
 * CLI validation script — mirrors runDeepValidation from preloader.ts.
 * Run from the project root: node scripts/validate.mjs
 */
import { readFileSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";
import {
    validateContextYaml,
    validateLayersYaml,
    validateScenarioYaml,
    validateChallengeYaml,
    validateLocationJson,
    validateContextRelations,
    validateScenarioRelations,
    validateChallengeRelations,
    collectLayerIds,
} from "../dist/modules/validation.js";

const ROOT = resolve(process.cwd());
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function loadYaml(relativePath) {
    const abs = join(ROOT, relativePath.replace(/^\//, ""));
    return yaml.load(readFileSync(abs, "utf8"));
}

function loadJson(relativePath) {
    const abs = join(ROOT, relativePath.replace(/^\//, ""));
    return JSON.parse(readFileSync(abs, "utf8"));
}

const errors = [];

// ─── context.yaml ─────────────────────────────────────────────────────────────
let rawContext;
try {
    rawContext = loadYaml("/config/context.yaml");
    errors.push(...validateContextYaml("context.yaml", rawContext));
    errors.push(...validateContextRelations("context.yaml", rawContext));
} catch (e) {
    console.error(`${RED}[Error] Failed to load context.yaml: ${e.message}${RESET}`);
    process.exit(1);
}

// ─── layers.yaml ──────────────────────────────────────────────────────────────
try {
    const rawLayers = loadYaml("/config/layers.yaml");
    errors.push(...validateLayersYaml("layers.yaml", rawLayers));
} catch (e) {
    console.error(`${YELLOW}[Warning] Failed to load layers.yaml: ${e.message}${RESET}`);
}

// ─── scenarios ────────────────────────────────────────────────────────────────
const knownLayerIds = rawContext ? collectLayerIds(rawContext) : new Set();
const scenarioIds = Object.keys(rawContext?.scenarios ?? {});

for (const scenarioId of scenarioIds) {
    if (rawContext?.scenarios?.[scenarioId]?.active === false) continue;
    const scenarioFile = `assets/scenarios/${scenarioId}/scenario.yaml`;
    let rawScenario;
    try {
        rawScenario = loadYaml(`/${scenarioFile}`);
    } catch (e) {
        console.error(`${YELLOW}[Warning] Cannot load ${scenarioFile}: ${e.message}${RESET}`);
        continue;
    }

    errors.push(...validateScenarioYaml(scenarioFile, rawScenario));

    try {
        errors.push(...validateScenarioRelations(scenarioFile, rawScenario, knownLayerIds));

        const roles = rawScenario?.roles;
        if (!roles || typeof roles !== "object" || Array.isArray(roles)) continue;
        for (const [, role] of Object.entries(roles)) {
            if (!role.challenge) continue;
            const challengePath = role.challenge.startsWith("./")
                ? `/assets/scenarios/${scenarioId}/${role.challenge.slice(2)}`
                : role.challenge;
            const challengeFile = challengePath.replace(/^\//, "");
            try {
                const rawChallenge = loadYaml(challengePath);
                errors.push(...validateChallengeYaml(challengeFile, rawChallenge));
                try {
                    errors.push(...validateChallengeRelations(challengeFile, rawChallenge, knownLayerIds));
                } catch { /* structure too broken for relational checks */ }
            } catch (e) {
                console.error(`${YELLOW}[Warning] Cannot load ${challengeFile}: ${e.message}${RESET}`);
            }
        }
    } catch { /* structure too broken for relational checks */ }
}

// ─── location JSON files ──────────────────────────────────────────────────────
const locationSources = new Set();
const scanLayers = (layers) => {
    Object.entries(layers).forEach(([, l]) => {
        if (l.layer_type === "locations" && l.src) locationSources.add(l.src);
    });
};
if (rawContext?.global?.layers) scanLayers(rawContext.global.layers);
Object.values(rawContext?.scenarios ?? {}).forEach((s) => {
    if (s.layers) scanLayers(s.layers);
    Object.values(s.roles ?? {}).forEach((r) => { if (r.layers) scanLayers(r.layers); });
});
for (const src of locationSources) {
    try {
        const rawJson = loadJson(src);
        errors.push(...validateLocationJson(src, rawJson));
    } catch (e) {
        console.error(`${YELLOW}[Warning] Cannot load ${src}: ${e.message}${RESET}`);
    }
}

// ─── Report ───────────────────────────────────────────────────────────────────
if (errors.length === 0) {
    console.log(`${GREEN}✓ All files valid.${RESET}`);
    process.exit(0);
} else {
    console.error(`\n${RED}Found ${errors.length} issue(s):${RESET}\n`);
    for (const { file, path, message } of errors) {
        const loc = path ? `${file} › ${path}` : file;
        console.error(`  ${RED}✗${RESET} ${loc}\n    ${message}\n`);
    }
    process.exit(1);
}
