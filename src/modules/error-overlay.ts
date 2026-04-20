export interface ValidationError {
	file: string;
	message: string;
	path?: string;
}

let overlayEl: HTMLElement | null = null;
let errors: ValidationError[] = [];

function render() {
	if (!overlayEl) return;

	overlayEl.innerHTML = `
		<div id="val-overlay-inner">
			<div id="val-overlay-header">
				<span>⚠ Validation Errors (${errors.length})</span>
				<button id="val-overlay-close">✕</button>
			</div>
			<ul id="val-overlay-list">
				${errors
					.map(
						(e) => `
					<li>
						<span class="val-file">${e.file}${e.path ? ` › ${e.path}` : ""}</span>
						<span class="val-msg">${e.message}</span>
					</li>`,
					)
					.join("")}
			</ul>
		</div>
	`;

	overlayEl
		.querySelector("#val-overlay-close")
		?.addEventListener("click", () => {
			overlayEl?.remove();
			overlayEl = null;
		});
}

function ensureOverlay() {
	if (!overlayEl) {
		overlayEl = document.createElement("div");
		overlayEl.id = "val-overlay";
		document.body.appendChild(overlayEl);
	}
}

export function reportValidationErrors(newErrors: ValidationError[]) {
	if (newErrors.length === 0) return;
	errors = [...errors, ...newErrors];
	newErrors.forEach((e) =>
		console.error(`[Validation] ${e.file}${e.path ? ` › ${e.path}` : ""}: ${e.message}`),
	);
	ensureOverlay();
	render();
}

export function clearValidationErrors() {
	errors = [];
	overlayEl?.remove();
	overlayEl = null;
}
