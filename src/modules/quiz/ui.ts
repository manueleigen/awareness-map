import { create } from '../lib.js';
import { t } from '../translater.js';
import { StoryPoint, BaseStoryPoint } from './types.js';

/**
 * Resets all visual quiz indicators and classes from the DOM.
 */
export function clearQuizAnswers(): void {
    // Remove selection classes
    document.querySelectorAll('.quiz-answer').forEach(el => el.classList.remove('quiz-answer'));
    document.querySelectorAll('.quiz-option-btn.selected').forEach(el => el.classList.remove('selected'));

    // Remove animation effects
    document.querySelectorAll('.quiz-pulse').forEach(el => el.classList.remove('quiz-pulse'));
    document.querySelectorAll('.quiz-location-pulse').forEach(el => el.classList.remove('quiz-location-pulse'));

    // Remove temporary markers and areas
    document.querySelectorAll('.quiz-location-marker').forEach(el => el.remove());
    document.querySelectorAll('.quiz-solution-marker').forEach(el => el.remove());
    document.querySelectorAll('.quiz-solution-radius').forEach(el => el.remove());
}

/**
 * Renders a horizontal progress bar indicating the current quiz step.
 */
export function renderProgress(container: HTMLElement, point: StoryPoint): void {
    if (!point.step || !point.total_steps) return;

    container.querySelector('.quiz-progress')?.remove();
    const wrapper = create('div');
    wrapper.className = 'quiz-progress';

    const barOuter = create('div');
    barOuter.className = 'quiz-progress-bar-outer';
    const barInner = create('div');
    barInner.className = 'quiz-progress-bar-inner';

    // Calculate width percentage
    const ratio = Math.max(0, Math.min(1, point.step / point.total_steps));
    barInner.style.width = `${ratio * 100}%`;
    barOuter.append(barInner);

    const label = create('div');
    label.className = 'quiz-progress-label';
    label.innerText = `${point.step} / ${point.total_steps}`;

    wrapper.append(barOuter, label);
    container.prepend(wrapper);
}

/**
 * Renders a brief "Success" screen before automatically proceeding to the next step.
 */
export function renderSuccessInterlude(
    container: HTMLElement,
    controls: HTMLElement,
    success: NonNullable<BaseStoryPoint['success_screen']>,
    callback: () => void
): void {
    container.innerHTML = '';
    controls.innerHTML = '';

    const title = create('h2');
    title.innerText = t(success.title_key || 'feedback.success_title', 'Success');
    const desc = create('p');
    desc.innerText = t(success.description_key || 'feedback.continue', 'Continuing...');

    container.append(title, desc);

    // Wait for the specified duration before firing the callback
    window.setTimeout(callback, success.duration_ms || 900);
}

