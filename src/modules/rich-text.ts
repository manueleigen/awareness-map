import { create } from "./lib.js";

const BOLD_DELIMITER = "**";
const ITALIC_DELIMITER = "*";

function appendPlainText(target: HTMLElement, text: string): void {
	if (!text) return;
	target.append(document.createTextNode(text));
}

function appendInlineNodes(target: HTMLElement, text: string): void {
	let i = 0;

	while (i < text.length) {
		let handledToken = false;

		if (text.startsWith(BOLD_DELIMITER, i)) {
			const end = text.indexOf(BOLD_DELIMITER, i + BOLD_DELIMITER.length);
			if (end !== -1) {
				const strong = create("strong");
				appendInlineNodes(
					strong,
					text.slice(i + BOLD_DELIMITER.length, end),
				);
				target.append(strong);
				i = end + BOLD_DELIMITER.length;
				handledToken = true;
			}
		}
		if (handledToken) continue;

		if (text.startsWith(ITALIC_DELIMITER, i)) {
			const end = text.indexOf(ITALIC_DELIMITER, i + ITALIC_DELIMITER.length);
			if (end !== -1) {
				const em = create("em");
				appendInlineNodes(em, text.slice(i + ITALIC_DELIMITER.length, end));
				target.append(em);
				i = end + ITALIC_DELIMITER.length;
				handledToken = true;
			}
		}
		if (handledToken) continue;

		const nextBold = text.indexOf(BOLD_DELIMITER, i);
		const nextItalic = text.indexOf(ITALIC_DELIMITER, i);
		const nextTokenCandidates = [nextBold, nextItalic].filter(
			(index) => index !== -1,
		);
		let nextToken =
			nextTokenCandidates.length > 0
				? Math.min(...nextTokenCandidates)
				: text.length;
		if (nextToken === i) {
			nextToken = i + 1;
		}
		appendPlainText(target, text.slice(i, nextToken));
		i = nextToken;
	}
}

function isBulletBlock(lines: string[]): boolean {
	return lines.length > 0 && lines.every((line) => line.trimStart().startsWith("- "));
}

export function renderInlineText(target: HTMLElement, text: string): void {
	target.textContent = "";
	appendInlineNodes(target, text.trim());
}

export function renderBlockText(target: HTMLElement, text: string): void {
	target.textContent = "";
	target.classList.add("rich-text");

	const normalized = text.replace(/\r\n/g, "\n").trim();
	if (!normalized) return;

	const blocks = normalized.split(/\n\s*\n/);

	blocks.forEach((block) => {
		const lines = block
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);

		if (lines.length === 0) return;

		if (isBulletBlock(lines)) {
			const list = create("ul");
			list.className = "rich-text-block rich-text-list";

			lines.forEach((line) => {
				const item = create("li");
				appendInlineNodes(item, line.replace(/^- /, "").trim());
				list.append(item);
			});

			target.append(list);
			return;
		}

		const paragraph = create("p");
		paragraph.className = "rich-text-block";
		appendInlineNodes(paragraph, lines.join(" "));
		target.append(paragraph);
	});
}
