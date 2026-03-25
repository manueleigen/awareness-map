import { app } from './state.js';
import { runQuiz } from './quiz/engine-core.js';
import { resetLayers, resetSliders } from './layers.js';

/**
 * Public entry point for starting a quiz/challenge.
 * Manages the transition to the 'quiz' view and handles the completion logic.
 * 
 * @param quizPath Path to the quiz YAML definition.
 */
export async function startQuiz(quizPath: string): Promise<void> {
    const { infoBoxContent, infoBoxControls } = app.ui;
    // Ensure we have valid UI targets for the quiz engine
    if (!infoBoxContent || !infoBoxControls) return;

    // Switch view to 'quiz' to lock certain UI updates
    app.view = 'quiz';

    await runQuiz(
        quizPath,
        infoBoxContent,
        infoBoxControls,
        (status) => {
            // Callback executed when the quiz reaches a terminal state (win/fail)
            if (app.currentScenario && app.currentRole) {
                const resultId = `${app.currentScenario}_${app.currentRole}`;
                app.challengeResults[resultId] = {
                    scenarioId: app.currentScenario,
                    roleId: app.currentRole,
                    status: status
                };
            }
            
            // Return to the map view
            app.view = 'map';
            
            // Comprehensive layer reset (restores default visibility)
            resetLayers().then(() => {
                resetSliders();
                // Trigger a global UI update to show results
                document.dispatchEvent(new CustomEvent('app-request-view-update'));
            });
        }
    );
}
