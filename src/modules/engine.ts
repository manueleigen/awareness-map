import { app } from './state.js';
import { runQuiz } from './quiz/engine-core.js';

/**
 * Public entry point for starting a quiz.
 * Manages the AppState and view transition on finish.
 */
export async function startQuiz(quizPath: string): Promise<void> {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls) return;

    app.view = 'quiz';

    await runQuiz(
        quizPath,
        infoBoxContent,
        infoBoxControls,
        (status) => {
            if (app.currentScenario && app.currentRole) {
                const resultId = `${app.currentScenario}_${app.currentRole}`;
                app.challengeResults[resultId] = {
                    scenarioId: app.currentScenario,
                    roleId: app.currentRole,
                    status: status
                };
            }
            app.view = 'map';
            // Trigger UI update
            document.dispatchEvent(new CustomEvent('app-request-view-update'));
        }
    );
}
