import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { getAskConfigStore } from "../src/config/store.ts";
import { runAskFlow } from "../src/ui/controller.ts";
import { renderCollapsedAskHint } from "../src/ui/visibility.ts";

const ALT_A = "\x1ba";
const ASK_HIDDEN_PATTERN = /Ask hidden/;
const TOGGLE_HINT_PATTERN = /alt\+a to expand/;
const CAPITALIZED_ALT_PATTERN = /Alt/;

function plainTheme() {
	return {
		bg(_color: string, text: string) {
			return text;
		},
		bold(text: string) {
			return text;
		},
		fg(_color: string, text: string) {
			return text;
		},
	};
}

test("collapsed hint advertises the configured visibility binding", () => {
	const lines = renderCollapsedAskHint(
		{ config: DEFAULT_ASK_CONFIG, theme: plainTheme() },
		60
	);

	assert.equal(lines.length, 3);
	assert.match(lines[1], ASK_HIDDEN_PATTERN);
	assert.match(lines[1], TOGGLE_HINT_PATTERN);
	assert.doesNotMatch(lines[1], CAPITALIZED_ALT_PATTERN);
});

test("collapsed hint truncates to the available width", () => {
	const lines = renderCollapsedAskHint(
		{ config: DEFAULT_ASK_CONFIG, theme: plainTheme() },
		8
	);

	assert.equal(lines.length, 3);
	for (const line of lines) {
		assert.ok(visibleWidth(line) <= 8);
	}
});

test("collapsed hint renders the label in accent and the binding in dim", () => {
	const calls: [string, string][] = [];
	const lines = renderCollapsedAskHint(
		{
			config: DEFAULT_ASK_CONFIG,
			theme: {
				fg(color: string, text: string) {
					calls.push([color, text]);
					return text;
				},
			},
		},
		60
	);

	assert.deepEqual(calls, [
		["accent", "Ask hidden"],
		["dim", "· alt+a to expand"],
		["accent", "─".repeat(60)],
	]);
	assert.equal(lines.length, 3);
});

test("ask flow collapses to one hint line and restores with the toggle binding", async () => {
	getAskConfigStore().setConfig({
		...DEFAULT_ASK_CONFIG,
		notifications: {
			...DEFAULT_ASK_CONFIG.notifications,
			enabled: false,
		},
	});

	let component:
		| {
				dispose?(): void;
				handleInput(data: string): void;
				render(width: number): string[];
		  }
		| undefined;

	const resultPromise = runAskFlow(
		{
			cwd: process.cwd(),
			mode: "tui",
			ui: {
				custom(callback: (...args: unknown[]) => unknown) {
					return new Promise((resolve) => {
						const tui = {
							requestRender() {
								// Rendering is not needed for this controller test.
							},
						};
						component = callback(
							tui,
							plainTheme(),
							{},
							resolve
						) as typeof component;
					});
				},
				notify() {
					// Notifications are disabled for this test.
				},
			},
		} as never,
		{
			questions: [
				{
					id: "q1",
					options: [{ label: "A", value: "a" }],
					prompt: "Question?",
				},
			],
		}
	);

	await new Promise((resolve) => setImmediate(resolve));
	const expanded = component?.render(80) ?? [];
	assert.ok(expanded.length > 1);

	component?.handleInput(ALT_A);
	const collapsed = component?.render(80) ?? [];
	assert.equal(collapsed.length, 3);
	assert.match(collapsed[1], ASK_HIDDEN_PATTERN);

	// Other keys are ignored while collapsed, so a hidden flow cannot be
	// cancelled by accident.
	component?.handleInput("\x1b");
	assert.equal((component?.render(80) ?? []).length, 3);

	component?.handleInput(ALT_A);
	assert.ok((component?.render(80) ?? []).length > 1);

	component?.handleInput("\x1b");
	const result = await resultPromise;
	assert.equal(result.cancelled, true);

	getAskConfigStore().setConfig(DEFAULT_ASK_CONFIG);
});
