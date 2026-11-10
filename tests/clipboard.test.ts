import assert from "node:assert/strict";
import test from "node:test";
import { Editor } from "@earendil-works/pi-tui";
import { wrapBracketedPaste } from "../src/clipboard.ts";

function createEditor() {
	const tui = {
		requestRender() {
			// Rendering is not needed for paste handling.
		},
	};
	return new Editor(tui as never, {} as never);
}

test("clipboard text is wrapped as an atomic bracketed paste", () => {
	assert.equal(
		wrapBracketedPaste("hello\nworld"),
		"\x1b[200~hello\nworld\x1b[201~"
	);
	assert.equal(wrapBracketedPaste(""), "\x1b[200~\x1b[201~");
});

test("editor inserts wrapped clipboard text as pasted content", () => {
	const editor = createEditor();

	editor.handleInput(wrapBracketedPaste("hello\nworld"));

	assert.equal(editor.getText(), "hello\nworld");
});

test("editor keeps large pastes behind a paste marker", () => {
	const editor = createEditor();
	const lines = Array.from({ length: 20 }, (_, index) => `line ${index}`);

	editor.handleInput(wrapBracketedPaste(lines.join("\n")));

	assert.equal(editor.getText(), "[paste #1 +20 lines]");
	assert.equal(editor.getExpandedText(), lines.join("\n"));
});
