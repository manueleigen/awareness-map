#!/usr/bin/env node
/**
 * CLI validation script — mirrors runDeepValidation from preloader.ts.
 * Run from the project root: node scripts/validate.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";

// Importing from dist as the source is TypeScript
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
} from "../dist/modules/validation.js";

import {
    validateI18nContext,
    validateI18nScenario,
    validateI18nChallenge,
} from "../dist/modules/validator-i18n.js";

const ROOT = resolve(process.cwd());
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

const errors = [];

function loadYaml(relativePath) {
    const abs = join(ROOT, relativePath.replace(/^\//, ""));
    return yaml.load(readFileSync(abs, "utf8"));
}

function loadJson(relativePath) {
    const abs = join(ROOT, relativePath.replace(/^\//, ""));
    return JSON.parse(readFileSync(abs, "utf8"));
}

function checkAsset(file, path, relativeAssetPath) {
    if (!relativeAssetPath) return;
    const abs = join(ROOT, relativeAssetPath.replace(/^\//, ""));
    if (!existsSync(abs)) {
        errors.push({
            file,
            path,
            message: `Asset missing: ${relativeAssetPath}`
        });
    }
}

// ─── context.yaml ─────────────────────────────────────────────────────────────
let rawContext;
try {
    rawContext = loadYaml("/config/context.yaml");
    errors.push(...validateContextYaml("context.yaml", rawContext));
    errors.push(...validateContextRelations("context.yaml", rawContext));
    errors.push(...validateI18nContext("context.yaml", rawContext));

    // Asset checks for layers
    const layerMap = collectLayerMap(rawContext);
    for (const [id, layer] of layerMap.entries()) {
        checkAsset("context.yaml", `layers.${id}.src`, layer.src);
        checkAsset("context.yaml", `layers.${id}.icon`, layer.icon);
        checkAsset("context.yaml", `layers.${id}.poi_icon`, layer.poi_icon);
    }
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
const knownLayers = rawContext ? collectLayerMap(rawContext) : new Map();
const scenarioIds = Object.keys(rawContext?.scenarios ?? {});

for (const scenarioId of scenarioIds) {
    const scenarioFile = `assets/scenarios/${scenarioId}/scenario.yaml`;
    let rawScenario;
    try {
        rawScenario = loadYaml(`/${scenarioFile}`);
    } catch (e) {
        console.error(`${YELLOW}[Warning] Cannot load ${scenarioFile}: ${e.message}${RESET}`);
        continue;
    }

    // Skip all validation (structural and relational) if scenario is marked inactive
    if (rawScenario?.active === false) continue;

    errors.push(...validateScenarioYaml(scenarioFile, rawScenario));
    errors.push(...validateScenarioRelations(scenarioFile, rawScenario, scenarioId, rawContext));
    errors.push(...validateI18nScenario(scenarioFile, rawScenario));

    const roles = rawScenario?.roles;
    if (!roles || typeof roles !== "object" || Array.isArray(roles)) continue;
    for (const [roleId, role] of Object.entries(roles)) {
        // Skip roles without challenges or explicitly marked inactive in context if we had such a field
        if (!role.challenge) continue;
        
        const challengePath = role.challenge.startsWith("./")
            ? `/assets/scenarios/${scenarioId}/${role.challenge.slice(2)}`
            : role.challenge;
        const challengeFile = challengePath.replace(/^\//, "");
        try {
            const rawChallenge = loadYaml(challengePath);
            errors.push(...validateChallengeYaml(challengeFile, rawChallenge));
            errors.push(...validateChallengeRelations(challengeFile, rawChallenge, knownLayers));
            errors.push(...validateI18nChallenge(challengeFile, rawChallenge));
        } catch (e) {
            console.error(`${YELLOW}[Warning] Cannot load ${challengeFile}: ${e.message}${RESET}`);
        }
    }
}

// ─── location JSON files ──────────────────────────────────────────────────────
const layerMap = rawContext ? collectLayerMap(rawContext) : new Map();
for (const [id, l] of layerMap.entries()) {
    if (l.layer_type === "locations" && l.src) {
        try {
            const rawJson = loadJson(l.src);
            errors.push(...validateLocationJson(l.src, rawJson, l));
        } catch (e) {
            console.error(`${YELLOW}[Warning] Cannot load ${l.src}: ${e.message}${RESET}`);
        }
    }
}

// ─── Report ───────────────────────────────────────────────────────────────────
if (errors.length === 0) {
    console.log(`${GREEN}✓ All files and assets valid.${RESET}`);
    process.exit(0);
} else {
    console.error(`\n${RED}Found ${errors.length} issue(s):${RESET}\n`);
    for (const { file, path, message } of errors) {
        const loc = path ? `${file} › ${path}` : file;
        console.error(`  ${RED}✗${RESET} ${loc}\n    ${message}\n`);
    }
    process.exit(1);
}
