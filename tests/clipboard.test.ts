import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { Editor } from "@earendil-works/pi-tui";
import {
	readClipboardImage,
	saveClipboardImage,
	wrapBracketedPaste,
} from "../src/clipboard.ts";

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

test("unsupported platforms have no clipboard image source", async () => {
	assert.equal(await readClipboardImage("aix"), null);
});

test("clipboard images are saved with their extension", async () => {
	const bytes = new Uint8Array([137, 80, 78, 71]);
	const filePath = await saveClipboardImage({ bytes, extension: "png" });

	assert.ok(filePath);
	assert.ok(filePath.endsWith(".png"));
	assert.deepEqual(new Uint8Array(await readFile(filePath)), bytes);
	await rm(filePath);
});
