import assert from "node:assert/strict";
import test from "node:test";
import { initTheme } from "@earendil-works/pi-coding-agent";
import { registerAnswerCommands } from "../src/answer-commands.ts";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { getAskConfigStore, resetAskConfigStore } from "../src/config/store.ts";

function registerCommands() {
	const commands = new Map<
		string,
		{ handler: (args: string, ctx: any) => Promise<void> }
	>();
	registerAnswerCommands({
		registerCommand(
			name: string,
			command: { handler: (args: string, ctx: any) => Promise<void> }
		) {
			commands.set(name, command);
		},
	} as never);
	return commands;
}

test("answer commands do not open custom UI outside TUI mode", async () => {
	const commands = registerCommands();
	const notifications: Array<{ message: string; type: string }> = [];
	let customOpened = false;
	const ctx = {
		mode: "rpc",
		ui: {
			custom() {
				customOpened = true;
			},
			notify(message: string, type: string) {
				notifications.push({ message, type });
			},
		},
	};

	await commands.get("answer")?.handler("", ctx);
	await commands.get("answer:again")?.handler("", ctx);
	await commands.get("ask:replay")?.handler("", ctx);

	assert.equal(customOpened, false);
	assert.deepEqual(notifications, [
		{ message: "/answer requires interactive TUI mode.", type: "error" },
		{ message: "Ask replay requires interactive TUI mode.", type: "error" },
		{ message: "Ask replay requires interactive TUI mode.", type: "error" },
	]);
});

test("answer uses the active chat model even outside the model rotation list", async (t) => {
	initTheme("dark", false);
	getAskConfigStore().setConfig(DEFAULT_ASK_CONFIG);
	t.after(resetAskConfigStore);
	const activeModel = { provider: "custom-chat", id: "current" };
	const usedModels: unknown[] = [];
	const notifications: string[] = [];
	const workingVisibility: boolean[] = [];
	const ctx = {
		mode: "tui",
		model: activeModel,
		scopedModels: [{ model: { provider: "other", id: "rotation-model" } }],
		modelRegistry: {
			complete(model: unknown) {
				usedModels.push(model);
				return Promise.resolve({
					stopReason: "stop",
					content: [{ type: "text", text: '{"questions":[]}' }],
				});
			},
		},
		sessionManager: {
			getBranch: () => [
				{
					id: "assistant-1",
					type: "message",
					message: {
						role: "assistant",
						stopReason: "stop",
						content: "No questions here.",
					},
				},
			],
		},
		ui: {
			custom(
				factory: (
					tui: { requestRender(): void },
					theme: { fg(token: string, text: string): string },
					keybindings: undefined,
					done: (result: unknown) => void
				) => { dispose(): void }
			) {
				return new Promise((resolve) => {
					const loader = factory(
						{ requestRender: () => undefined },
						{ fg: (_token: string, text: string) => text },
						undefined,
						(result: unknown) => {
							loader.dispose();
							resolve(result);
						}
					);
				});
			},
			notify(message: string) {
				notifications.push(message);
			},
			setWorkingVisible(visible: boolean) {
				workingVisibility.push(visible);
			},
		},
	};
	const answer = registerCommands().get("answer");
	assert.ok(answer);
	await answer.handler("", ctx);

	assert.equal(usedModels[0], activeModel);
	assert.deepEqual(workingVisibility, [false, true]);
	assert.deepEqual(notifications, [
		"No questions found in the latest assistant message.",
	]);

	await answer.handler("", { ...ctx, model: undefined });
	assert.deepEqual(usedModels, [activeModel]);
	assert.equal(
		notifications.at(-1),
		"Select a chat model before running /answer."
	);
});
