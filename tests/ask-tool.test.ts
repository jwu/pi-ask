import assert from "node:assert/strict";
import test from "node:test";
import { Value } from "typebox/value";
import { ASK_PAYLOAD_ENTRY_VERSION } from "../src/ask-payload-store.ts";
import { registerAskTool } from "../src/ask-tool.ts";
import { parseAskToolParams } from "../src/ask-tool-params.ts";
import type { AskToolParams, AskToolParamsSchema } from "../src/schema.ts";

const NON_INTERACTIVE_MESSAGE_RE =
	/Needs user input: ask_user requires interactive TUI mode\./;
const RECEIVED_PAYLOAD_RE = /Received payload:/;

const params: AskToolParams = {
	questions: [
		{
			header: "Goal",
			question: "What should I optimize for?",
			options: [
				{ label: "Speed", description: "Finish sooner" },
				{ label: "Safety", description: "Reduce risk", recommended: true },
			],
		},
	],
};

function registerMockTool() {
	const tools: Record<string, unknown>[] = [];
	const entries: Array<{ customType: string; data: unknown }> = [];
	registerAskTool({
		appendEntry(customType: string, data: unknown) {
			entries.push({ customType, data });
		},
		registerTool(tool: Record<string, unknown>) {
			tools.push(tool);
		},
	} as never);
	return {
		entries,
		tool: tools[0] as {
			execute: (...args: any[]) => Promise<any>;
			parameters: typeof AskToolParamsSchema;
			promptGuidelines: string[];
			renderCall: (args: unknown, theme: unknown) => { text: string };
			renderResult: (
				result: unknown,
				options: unknown,
				theme: unknown
			) => { text: string };
		},
	};
}

test("ask tool declares compact arguments and structured recommendations", () => {
	const { tool } = registerMockTool();
	assert(Value.Check(tool.parameters, params));
	assert(
		tool.promptGuidelines.some((guideline) =>
			guideline.includes("recommended: true")
		)
	);
	const [question] = params.questions;
	assert(
		!Value.Check(tool.parameters, {
			questions: [{ ...question, type: "preview" }],
		})
	);
	assert(
		!Value.Check(tool.parameters, {
			questions: [
				{
					...question,
					options: [
						{ ...question.options[0], value: "speed" },
						question.options[1],
					],
				},
			],
		})
	);
	assert(
		!Value.Check(tool.parameters, {
			questions: [{ ...question, options: question.options.slice(0, 1) }],
		})
	);
	assert(!Value.Check(tool.parameters, { questions: [] }));
	assert(
		!Value.Check(tool.parameters, { questions: new Array(5).fill(question) })
	);
});

test("ask tool stores normalized parameters before returning the non-interactive fallback", async () => {
	const { entries, tool } = registerMockTool();
	const result = await tool.execute("call-1", params, undefined, undefined, {
		mode: "print",
	});

	assert.equal(entries.length, 1);
	assert.equal(entries[0].customType, "ask:payload");
	assert.deepEqual(entries[0].data, {
		version: ASK_PAYLOAD_ENTRY_VERSION,
		source: "tool",
		params: parseAskToolParams(params).params,
		sourceEntryId: "call-1",
		timestamp: (entries[0].data as { timestamp: number }).timestamp,
	});
	assert.equal(result.details.cancelled, true);
	assert.equal(result.details.mode, "submit");
	assert.deepEqual(result.details.questions, [
		{
			id: "q1",
			label: "Goal",
			prompt: "What should I optimize for?",
			type: "single",
		},
	]);
	assert.deepEqual(result.details.answers, {});
	assert.match(result.content[0].text, NON_INTERACTIVE_MESSAGE_RE);
	assert(result.content[0].text.includes("Type your own"));
});

test("ask tool does not open custom UI outside TUI mode", async () => {
	const { tool } = registerMockTool();
	const result = await tool.execute("call-1", params, undefined, undefined, {
		mode: "rpc",
		ui: {
			custom() {
				assert.fail("opened UI in RPC mode");
			},
		},
	});
	assert.equal(result.details.cancelled, true);
	assert.match(result.content[0].text, NON_INTERACTIVE_MESSAGE_RE);
});

test("one preview enables single-select preview mode and multi-select takes precedence", () => {
	const [question] = params.questions;
	const options = [
		{ ...question.options[0], preview: " # Speed " },
		question.options[1],
	];
	const converted = parseAskToolParams({
		questions: [
			{ ...question, options },
			{
				...question,
				question: "What should I track?",
				options,
				multiSelect: true,
			},
		],
	}).params;
	assert(converted);
	assert.deepEqual(
		converted.questions.map((item) => item.type),
		["preview", "multi"]
	);
	assert.deepEqual(
		converted.questions[0].options.map((option) => option.preview),
		["# Speed", undefined]
	);
	assert.deepEqual(
		converted.questions[1].options.map((option) => option.preview),
		[undefined, undefined]
	);
	assert.deepEqual(
		converted.questions[0].options.map((option) => option.value),
		["option_1", "option_2"]
	);
	assert.equal(converted.questions[0].options[1].recommended, true);
});

test("ask tool reports ambiguous labels and duplicate questions before opening UI", async () => {
	const { entries, tool } = registerMockTool();
	const [question] = params.questions;
	const input = {
		questions: [
			{
				...question,
				options: [
					question.options[0],
					{ ...question.options[0], label: " Speed " },
				],
			},
			{
				...question,
				options: [
					question.options[0],
					{ ...question.options[1], label: "Other" },
				],
			},
		],
	};
	const result = await tool.execute("invalid", input, undefined, undefined, {
		mode: "tui",
	});
	assert.equal(entries.length, 0);
	assert.equal(result.details.error.kind, "invalid_input");
	assert.deepEqual(
		result.details.error.issues.map((issue: { path: string }) => issue.path),
		[
			"questions[0].options[1].label",
			"questions[1].question",
			"questions[1].options[1].label",
		]
	);
	assert.match(result.content[0].text, RECEIVED_PAYLOAD_RE);
});

test("ask tool transcript shows an Ask title and accent-colored headers", () => {
	const { tool } = registerMockTool();
	const theme = {
		bold: (text: string) => `<bold>${text}</bold>`,
		fg: (token: string, text: string) => `<${token}>${text}</${token}>`,
	};

	const callText = tool.renderCall(
		{
			questions: [
				{ header: " 发布策略 " },
				{ header: "验收条件" },
				{ header: "异常处置" },
			],
		},
		theme
	).text;
	assert.equal(
		callText,
		"<toolTitle><bold>Ask</bold></toolTitle> <accent>发布策略 · 验收条件 · 异常处置</accent>"
	);
	assert.equal(
		tool.renderCall({}, theme).text,
		"<toolTitle><bold>Ask</bold></toolTitle>"
	);
});

test("ask tool transcript renders cancelled and invalid results", () => {
	const { tool } = registerMockTool();
	const theme = {
		fg: (_token: string, text: string) => text,
	};

	const resultText = tool.renderResult(
		{
			content: [{ type: "text", text: "ignored" }],
			details: {
				cancelled: true,
				mode: "submit",
				questions: [],
				answers: {},
			},
		},
		undefined,
		theme
	).text;
	assert.equal(resultText, "Cancelled");

	const invalidText = tool.renderResult(
		{
			content: [{ type: "text", text: "ignored" }],
			details: {
				cancelled: true,
				mode: "submit",
				questions: [],
				answers: {},
				error: {
					kind: "invalid_input",
					issues: [],
				},
			},
		},
		undefined,
		theme
	).text;
	assert.equal(invalidText, "Invalid tool payload");

	const schemaErrorText = tool.renderResult(
		{
			content: [
				{
					type: "text",
					text: 'Validation failed for tool "ask_user": missing label',
				},
			],
			details: {},
		},
		undefined,
		theme
	).text;
	assert.equal(
		schemaErrorText,
		'Validation failed for tool "ask_user": missing label'
	);
});
