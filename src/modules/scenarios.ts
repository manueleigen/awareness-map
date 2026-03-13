import { app } from './state.js';
import { create, loadYAML } from './lib.js';
import { t } from './translater.js';
import { ProjectContext } from './types.js';
import { updateView } from './main.js';

let context: ProjectContext | null = null;

export async function initScenarios(): Promise<void> {
    const ctxWrapper = await loadYAML<{ contexts: ProjectContext }>('/config/context.yaml');
    if (ctxWrapper) {
        context = ctxWrapper.contexts;
    }
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

        btn.addEventListener('click', async () => {
            app.currentScenario = scenarioId;
            app.view = 'role-select';
            await updateView();
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

        btn.addEventListener('click', async () => {
            app.currentRole = roleId;
            app.view = 'map';
            await updateView();
        });

        btnGroup.append(btn);
    });

    const backBtn = create('button');
    backBtn.className = 'back-btn';
    backBtn.innerText = t('navigation.back');
    backBtn.addEventListener('click', async () => {
        app.currentScenario = null;
        app.view = 'scenario-select';
        await updateView();
    });

    infoBoxControls.append(btnGroup); //, backBtn
}



export function getQuizPath(): string | null {
    if (!context || !app.currentScenario) return null;
    const scenario = context.scenarios[app.currentScenario];
    if (!scenario) return null;

    if (app.currentRole) {
        const role = scenario.roles[app.currentRole];
        if (role?.quiz) return role.quiz;
    }

    return scenario.quiz || null;
}
