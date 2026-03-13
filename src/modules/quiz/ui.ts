import { create, group } from '../lib.js';
import { t } from '../translater.js';
import { StoryPoint, BaseStoryPoint } from './types.js';

export function clearQuizAnswers(): void {
    group('.quiz-answer').forEach(el => el.classList.remove('quiz-answer'));
    group('.quiz-option-btn.selected').forEach(el => el.classList.remove('selected'));
    group('.quiz-pulse').forEach(el => el.classList.remove('quiz-pulse'));
    group('.quiz-location-pulse').forEach(el => el.classList.remove('quiz-location-pulse'));
    group('.quiz-location-marker').forEach(el => el.remove());
    group('.quiz-solution-marker').forEach(el => el.remove());
    group('.quiz-solution-radius').forEach(el => el.remove());
}

export function renderProgress(container: HTMLElement, point: StoryPoint): void {
    if (!point.step || !point.total_steps) return;

    container.querySelector('.quiz-progress')?.remove();
    const wrapper = create('div');
    wrapper.className = 'quiz-progress';

    const barOuter = create('div');
    barOuter.className = 'quiz-progress-bar-outer';
    const barInner = create('div');
    barInner.className = 'quiz-progress-bar-inner';

    const ratio = Math.max(0, Math.min(1, point.step / point.total_steps));
    barInner.style.width = `${ratio * 100}%`;
    barOuter.append(barInner);

    const label = create('div');
    label.className = 'quiz-progress-label';
    label.innerText = `${point.step} / ${point.total_steps}`;

    wrapper.append(barOuter, label);
    container.prepend(wrapper);
}

export function renderSuccessInterlude(
    container: HTMLElement,
    controls: HTMLElement,
    success: NonNullable<BaseStoryPoint['success_screen']>,
    callback: () => void
): void {
    container.innerHTML = '';
    controls.innerHTML = '';

    const title = create('h2');
    title.innerText = t(success.title_key || 'feedback.success_title', 'Erfolg');
    const desc = create('p');
    desc.innerText = t(success.description_key || 'feedback.continue', 'Weiter');

    container.append(title, desc);
    window.setTimeout(callback, success.duration_ms || 900);
}
