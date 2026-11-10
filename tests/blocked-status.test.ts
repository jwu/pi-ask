import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { getAskConfigStore } from "../src/config/store.ts";
import { BLOCKED_LABEL } from "../src/herdr-state.ts";
import { runAskFlow } from "../src/ui/controller.ts";

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

test("the ask form reports pi as blocked while it waits for an answer", async () => {
	getAskConfigStore().setConfig({
		...DEFAULT_ASK_CONFIG,
		notifications: {
			...DEFAULT_ASK_CONFIG.notifications,
			enabled: false,
		},
	});

	let options: unknown;
	let finish: ((result: { cancelled: true }) => void) | undefined;

	const resultPromise = runAskFlow(
		{
			cwd: process.cwd(),
			mode: "tui",
			ui: {
				custom(
					callback: (...args: unknown[]) => unknown,
					customOptions?: unknown
				) {
					options = customOptions;
					return new Promise((resolve) => {
						finish = resolve as typeof finish;
						callback(
							{
								requestRender() {
									// Rendering is not needed for this controller test.
								},
								terminal: { columns: 120, rows: 40 },
							},
							plainTheme(),
							{},
							resolve
						);
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

	assert.deepEqual(options, {
		blocked: { kind: "question", message: BLOCKED_LABEL },
	});

	finish?.({ cancelled: true });
	await resultPromise;

	getAskConfigStore().setConfig(DEFAULT_ASK_CONFIG);
});
