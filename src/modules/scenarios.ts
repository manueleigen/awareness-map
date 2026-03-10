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
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls || !context) return;

    infoBoxContent.innerHTML = '';
    infoBoxControls.innerHTML = '';

    const headline = create('h2');
    headline.innerText = t('home.scenario_selection_label');
    infoBoxContent.append(headline);

    const btnGroup = create('div');
    btnGroup.className = 'button-group';

    Object.keys(context.scenarios).forEach(scenarioId => {
        const btn = create('button');
        btn.innerText = t(`scenarios.${scenarioId}.title`);

        btn.addEventListener('click', () => {
            app.currentScenario = scenarioId;
            app.view = 'role-select';
            updateView();
        });

        btnGroup.append(btn);
    });

    infoBoxControls.append(btnGroup);
}

export function renderRoleSelection(): void {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls || !context || !app.currentScenario) return;

    const scenario = context.scenarios[app.currentScenario];
    if (!scenario) return;

    infoBoxContent.innerHTML = '';
    infoBoxControls.innerHTML = '';

    const headline = create('h2');
    headline.innerText = t(`scenarios.${app.currentScenario}.role_selection_label`);
    infoBoxContent.append(headline);

    const btnGroup = create('div');
    btnGroup.className = 'button-group';

    Object.keys(scenario.roles).forEach(roleId => {
        const btn = create('button');
        btn.innerText = t(`roles.${roleId}.title`);

        btn.addEventListener('click', () => {
            app.currentRole = roleId;
            app.view = 'map';
            updateView();
        });

        btnGroup.append(btn);
    });

    const backBtn = create('button');
    backBtn.className = 'back-btn';
    backBtn.innerText = t('navigation.back');
    backBtn.addEventListener('click', () => {
        app.currentScenario = null;
        app.view = 'scenario-select';
        updateView();
    });

    infoBoxControls.append(btnGroup, backBtn);
}
