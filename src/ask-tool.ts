import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { appendAskPayload } from "./ask-payload-store.ts";
import {
	ASK_TOOL_DESCRIPTION,
	ASK_TOOL_PROMPT_GUIDELINES,
	invalidPayloadResponse,
	nonInteractiveResponse,
	renderAskToolCall,
	renderAskToolResult,
	successfulResponse,
	validateParams,
} from "./ask-tool-helpers.ts";
import { parseAskToolParams } from "./ask-tool-params.ts";
import { getAskConfigStore } from "./config/store.ts";
import type { RemoteAskRuntime } from "./remote-ask.ts";
import { AskToolParamsSchema } from "./schema.ts";
import { runAskFlow } from "./ui/controller.ts";

export function registerAskTool(
	pi: ExtensionAPI,
	remoteAsk?: RemoteAskRuntime
) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description: ASK_TOOL_DESCRIPTION,
		promptSnippet:
			"Ask the user up to 4 structured questions (2-4 options each) when requirements are ambiguous",
		promptGuidelines: [...ASK_TOOL_PROMPT_GUIDELINES],
		parameters: AskToolParamsSchema,
		execute: (toolCallId, params, _signal, _onUpdate, ctx) =>
			executeAskTool(pi, toolCallId, params, ctx, remoteAsk),
		renderCall: renderAskToolCall,
		renderResult: renderAskToolResult,
	});
}

async function executeAskTool(
	pi: Pick<ExtensionAPI, "appendEntry">,
	toolCallId: string,
	input: unknown,
	ctx: ExtensionContext,
	remoteAsk?: RemoteAskRuntime
) {
	const parsed = parseAskToolParams(input);
	if (parsed.issues) {
		return invalidPayloadResponse(input, parsed.issues);
	}
	const { params } = parsed;
	const config = await getAskConfigStore().getConfig();
	const validation = validateParams(params, {
		presentSingleAsMulti: config.behaviour.presentSingleAsMulti,
	});
	if (!validation.ok) {
		return invalidPayloadResponse(input, validation.issues);
	}
	appendAskPayload(pi, {
		params,
		source: "tool",
		sourceEntryId: toolCallId,
	});
	if (ctx.mode !== "tui") {
		return nonInteractiveResponse(validation.state);
	}
	ctx.ui.setWorkingVisible(false);
	try {
		const result = await runAskFlow(ctx, params, {
			remote: remoteAsk
				? { runtime: remoteAsk, source: "tool", toolCallId }
				: undefined,
		});
		return successfulResponse(result);
	} finally {
		ctx.ui.setWorkingVisible(true);
	}
}
