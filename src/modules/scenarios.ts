import { app } from './state.js';
import { create, loadYAML } from './lib.js';
import { t } from './translater.js';
import { ProjectContext } from './types.js';
import { updateView } from './main.js';

let context: ProjectContext | null = null;

export async function initScenarios(): Promise<void> {
    const ctxWrapper = await loadYAML<{ contexts: ProjectContext }>('/config/context.yaml');
    context = ctxWrapper.contexts;
}

export function renderScenarioSelection(): void {
    const { infoBoxContent } = app.ui;
    if (!infoBoxContent || !context) return;

    infoBoxContent.innerHTML = '';

    const headline = create('h2');
    headline.innerText = t('home.scenario_selection_label');
    infoBoxContent.append(headline);

    const slider = create('div');
    slider.id = 'scenario-slider';
    slider.className = 'horizontal-slider';

    Object.keys(context.scenarios).forEach(scenarioId => {
        const scenarioCard = create('div');
        scenarioCard.className = 'scenario-card';
        
        const title = create('h3');
        title.innerText = t(`scenarios.${scenarioId}.title`);
        
        const desc = create('p');
        desc.innerText = t(`scenarios.${scenarioId}.short_title`); // Using short title for cards

        scenarioCard.append(title, desc);
        
        scenarioCard.addEventListener('click', () => {
            app.currentScenario = scenarioId;
            app.view = 'role-select';
            updateView();
        });

        slider.append(scenarioCard);
    });

    infoBoxContent.append(slider);
}

export function renderRoleSelection(): void {
    const { infoBoxContent } = app.ui;
    if (!infoBoxContent || !context || !app.currentScenario) return;

    const scenario = context.scenarios[app.currentScenario];
    if (!scenario) return;

    infoBoxContent.innerHTML = '';

    const headline = create('h2');
    headline.innerText = t(`scenarios.${app.currentScenario}.role_selection_label`);
    infoBoxContent.append(headline);

    const slider = create('div');
    slider.id = 'role-slider';
    slider.className = 'horizontal-slider';

    Object.keys(scenario.roles).forEach(roleId => {
        const roleCard = create('div');
        roleCard.className = 'role-card';

        const title = create('h3');
        title.innerText = t(`roles.${roleId}.title`);

        roleCard.append(title);

        roleCard.addEventListener('click', () => {
            app.currentRole = roleId;
            app.view = 'map';
            updateView();
        });

        slider.append(roleCard);
    });

    const backBtn = create('button');
    backBtn.innerText = t('navigation.back');
    backBtn.addEventListener('click', () => {
        app.currentScenario = null;
        app.view = 'scenario-select';
        updateView();
    });

    infoBoxContent.append(slider, backBtn);
}
