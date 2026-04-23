import { ValidationError } from "./error-overlay.js";
import { ChallengeYaml, ProjectContextDefinition, ScenarioDefinitionInput } from "./types.js";

const REQUIRED_LANGS = ["de", "en"] as const;

export function validateI18nContext(file: string, context: ProjectContextDefinition): ValidationError[] {
	const errors: ValidationError[] = [];

	// Check Global Layers
	(context.global?.layers ?? []).forEach((layer) => {
		const needsLabel = layer.toggle === "available" || layer.toggle === "deactivated";
		if (!needsLabel) return;

		REQUIRED_LANGS.forEach(lang => {
			if (layer.label?.[lang] === undefined) {
				errors.push({ file, path: `global.layers.${layer.id}.label.${lang}`, message: `Missing ${lang} translation for layer label (required because toggle is ${layer.toggle})` });
			}
		});
	});

	// Check Scenarios in Context
	(context.scenarios ?? []).forEach((scenario) => {
		if (scenario.active === false) return;
		(scenario.layers ?? []).forEach((layer) => {
			const needsLabel = layer.toggle === "available" || layer.toggle === "deactivated";
			if (!needsLabel) return;

			REQUIRED_LANGS.forEach(lang => {
				if (layer.label?.[lang] === undefined) {
					errors.push({ file, path: `scenarios.${scenario.id}.layers.${layer.id}.label.${lang}`, message: `Missing ${lang} translation for layer label (required because toggle is ${layer.toggle})` });
				}
			});
		});
	});

	return errors;
}

export function validateI18nScenario(file: string, scenario: ScenarioDefinitionInput): ValidationError[] {
	const errors: ValidationError[] = [];

	REQUIRED_LANGS.forEach(lang => {
		if (!scenario.text?.[lang]) {
			errors.push({ file, path: `text.${lang}`, message: `Scenario text for ${lang} is missing` });
		} else {
			const t = scenario.text[lang];
			if (t.title === undefined) errors.push({ file, path: `text.${lang}.title`, message: `Title missing for ${lang}` });
			if (t.description === undefined) errors.push({ file, path: `text.${lang}.description`, message: `Description missing for ${lang}` });
		}
	});

	(scenario.roles ?? []).forEach((role) => {
		REQUIRED_LANGS.forEach(lang => {
			if (role.text?.[lang]?.title === undefined) {
				errors.push({ file, path: `roles.${role.id}.text.${lang}.title`, message: `Role title missing for ${lang}` });
			}
		});
	});

	return errors;
}

export function validateI18nChallenge(file: string, challenge: ChallengeYaml): ValidationError[] {
	const errors: ValidationError[] = [];

	challenge.story_points.forEach((point, idx) => {
		const at = `story_points[${point.id || idx}]`;
		REQUIRED_LANGS.forEach(lang => {
			if (!point.text?.[lang]) {
				errors.push({ file, path: `${at}.text.${lang}`, message: `Translation missing for ${lang}` });
			}
		});
	});

	return errors;
}
