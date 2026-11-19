import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { renderResultText } from "./result.ts";
import { createInitialState } from "./state/create.ts";
import { collectValidationIssues } from "./state/normalize.ts";
import { summarizeResult, toAskResult } from "./state/result.ts";
import type { AskParams, AskResult, AskValidationIssue } from "./types.ts";

// Adapted from rpiv-ask-user-question. See the notice in LICENSE.
export const ASK_TOOL_DESCRIPTION = `Ask the user one or more structured questions during execution. Use when you need to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take

Usage notes:
- Each question offers 2-4 distinct choices. Users can type a custom answer via the automatically appended "Type your own" row or press Esc to abandon the questionnaire. Do not author a custom-answer option yourself.
- Use multiSelect: true when multiple answers are valid. Custom text can accompany selected choices in a multi-select answer.
- If you recommend a specific option, put it first, set recommended: true, and explain the reason in its description.

Preview feature:
Use the optional preview field on options when presenting concrete artifacts that users need to visually compare:
- ASCII mockups of UI layouts or components
- Code snippets showing different implementations
- Diagram variations
- Configuration examples

Preview content renders as Markdown. If any option on a single-select question has preview content, the terminal displays it beside or below the option list. Use descriptions for simple preferences. Previews are only supported for single-select questions.`;

export const ASK_TOOL_PROMPT_GUIDELINES = [
	"Use ask_user whenever the user's request is underspecified and you cannot proceed without concrete decisions. You can ask up to 4 questions per invocation.",
	"Each question must have 2-4 options. Give each one a concise label and a description explaining its meaning or trade-offs. The tool automatically offers a custom answer.",
	"Set multiSelect: true when multiple answers are valid. For single-select questions, use an option's preview for concrete Markdown examples. Mark a grounded recommendation with recommended: true and explain it in the description.",
	"Group independent clarifying questions into one invocation. Ask sequentially when a later question depends on the previous answer.",
	"When a result requests elaboration, address the user's notes first. Re-ask only the affected questions if a choice is still needed.",
] as const;

interface ValidateParamsOptions {
	allowFreeform?: boolean;
	presentSingleAsMulti?: boolean;
}

export function validateParams(
	params: AskParams,
	options: ValidateParamsOptions = {}
):
	| { ok: true; state: ReturnType<typeof createInitialState> }
	| { ok: false; issues: AskValidationIssue[] } {
	const issues = collectValidationIssues(params, options);
	if (issues.length > 0) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		state: createInitialState(params, options),
	};
}

export function invalidPayloadResponse(
	params: unknown,
	issues: AskValidationIssue[]
) {
	return {
		content: [
			{ type: "text" as const, text: formatValidationError(params, issues) },
		],
		details: errorResultDetails(issues),
	};
}

export function nonInteractiveResponse(
	state: ReturnType<typeof createInitialState>
) {
	return {
		content: [
			{ type: "text" as const, text: formatNonInteractiveMessage(state) },
		],
		details: {
			...toAskResult(state),
			cancelled: true,
		},
	};
}

export function successfulResponse(result: AskResult) {
	return {
		content: [{ type: "text" as const, text: summarizeResult(result) }],
		details: result,
	};
}

type ToolTheme = ExtensionContext["ui"]["theme"];

export function renderAskToolCall(args: unknown, theme: ToolTheme) {
	const params = args as { questions?: Array<{ header?: string }> } | undefined;
	const labels = Array.isArray(params?.questions)
		? params.questions
				.map((question, index) => {
					const header = question?.header;
					return (
						(typeof header === "string" && header.trim()) || `Q${index + 1}`
					);
				})
				.join(" · ")
		: "";
	const title = theme.fg("toolTitle", theme.bold("ask_user"));
	const text = labels ? `${title} ${theme.fg("accent", labels)}` : title;
	return new Text(text, 0, 0);
}

export function renderAskToolResult(
	result: {
		content: Array<{ type?: string; text?: string }>;
		details?: AskResult;
	},
	_options: unknown,
	theme: ToolTheme
) {
	const details = result.details;
	if (!(details && Array.isArray(details.questions))) {
		const text = result.content[0];
		return new Text(text?.type === "text" ? (text.text ?? "") : "", 0, 0);
	}
	const text = renderResultText(details);
	return new Text(
		details.error || details.cancelled ? theme.fg("warning", text) : text,
		0,
		0
	);
}

function errorResultDetails(issues: AskValidationIssue[]): AskResult {
	return {
		cancelled: true,
		mode: "submit",
		questions: [],
		answers: {},
		error: {
			kind: "invalid_input",
			issues,
		},
	};
}

// Args often arrive empty when a model's tool-call arguments degrade; echoing what was
// actually received lets it self-correct instead of retrying the same payload.
const RECEIVED_PAYLOAD_MAX_CHARS = 800;

function formatValidationError(params: unknown, issues: AskValidationIssue[]) {
	const lines = [
		"Invalid ask_user payload:",
		...issues.map((issue) => `- ${issue.path}: ${issue.message}`),
	];
	const payload = formatReceivedPayload(params);
	if (payload) {
		lines.push("", payload);
	}
	return lines.join("\n");
}

function formatReceivedPayload(params: unknown): string | undefined {
	let text: string;
	try {
		text = JSON.stringify(params, null, 2);
	} catch {
		return;
	}
	if (!text) {
		return;
	}
	if (text.length > RECEIVED_PAYLOAD_MAX_CHARS) {
		text = `${text.slice(0, RECEIVED_PAYLOAD_MAX_CHARS)}\n… truncated`;
	}
	return `Received payload:\n${text}`;
}

function formatNonInteractiveMessage(
	state: ReturnType<typeof createInitialState>
): string {
	const lines = [
		"Needs user input: ask_user requires interactive TUI mode.",
		"Run same tool call in interactive TUI mode, or ask user these questions manually:",
	];

	for (const [index, question] of state.questions.entries()) {
		lines.push(`${index + 1}. ${question.label}: ${question.prompt}`);
		for (const option of question.options) {
			lines.push(`   - ${option.label}`);
		}
		lines.push("   - Type your own [custom]");
	}

	lines.push(
		"details.questions contains normalized pending questions. details.answers stays empty until user responds."
	);
	return lines.join("\n");
}
