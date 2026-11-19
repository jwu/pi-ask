import assert from "node:assert/strict";
import test from "node:test";
import {
	collectExtractionBusinessIssues,
	createExtractionContext,
	extractionCandidateFromContent,
	parseExtractionCandidate,
	repairExtractionParams,
} from "../src/answer-extraction.ts";

test("extraction business rules flag option spam", () => {
	const issues = collectExtractionBusinessIssues({
		questions: [
			{
				id: "q",
				prompt: "Pick one",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
					{ value: "c", label: "C" },
					{ value: "d", label: "D" },
					{ value: "e", label: "E" },
				],
			},
		],
	});

	assert.deepEqual(issues, ["questions[0].options has 5 items; max is 4"]);
});

test("repairExtractionParams caps options while preserving other", () => {
	const repaired = repairExtractionParams({
		questions: [
			{
				id: "q",
				prompt: "Pick one",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
					{ value: "c", label: "C" },
					{ value: "d", label: "D" },
					{ value: "other", label: "Other" },
				],
			},
		],
	});

	assert.deepEqual(
		repaired.questions[0]?.options.map((option) => option.value),
		["a", "b", "c", "other"]
	);
});

test("repairExtractionParams drops generic conversational prompts", () => {
	const repaired = repairExtractionParams({
		questions: [
			{
				id: "generic",
				prompt: "How can I help you today?",
				options: [{ value: "help", label: "Help me" }],
			},
		],
	});

	assert.deepEqual(repaired.questions, []);
});

test("extraction context includes the tool and preceding turn", () => {
	const context = createExtractionContext({
		assistantText: "Which direction: A or B?",
		attempt: 0,
		lastError: "",
		lastResponse: "",
		previousUserText: "Choose an implementation direction.",
	});

	assert.equal(context.tools?.[0]?.name, "ask_user");
	assert.equal(context.tools?.length, 1);
	assert.equal(
		(context.systemPrompt ?? "").includes("Never add recommendation metadata."),
		true
	);
	const prompt = JSON.stringify(context.messages[0]?.content);
	assert.equal(prompt.includes("Choose an implementation direction."), true);
	assert.equal(prompt.includes("Which direction: A or B?"), true);
});

test("tool-call arguments become the extraction candidate", () => {
	const candidate = extractionCandidateFromContent([
		{ type: "thinking", thinking: "ignored" },
		{
			type: "toolCall",
			id: "call-1",
			name: "ask_user",
			arguments: {
				title: "Direction",
				questions: [
					{
						id: "direction",
						prompt: "Which direction?",
						options: [{ value: "a", label: "A" }],
					},
				],
			},
		},
	] as never);
	const result = parseExtractionCandidate(candidate);

	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.params.title, "Direction");
	}
});

test("tool-call arguments take precedence over text", () => {
	const candidate = extractionCandidateFromContent([
		{ type: "text", text: "not JSON" },
		{
			type: "toolCall",
			id: "call-1",
			name: "ask_user",
			arguments: { questions: [] },
		},
	] as never);

	assert.equal(parseExtractionCandidate(candidate).ok, true);
});

test("multiple tool calls are rejected", () => {
	const candidate = extractionCandidateFromContent([
		{
			type: "toolCall",
			id: "call-1",
			name: "ask_user",
			arguments: { questions: [] },
		},
		{
			type: "toolCall",
			id: "call-2",
			name: "ask_user",
			arguments: { questions: [] },
		},
	] as never);

	assert.equal(parseExtractionCandidate(candidate).ok, false);
});

test("fenced text remains a fallback", () => {
	const result = parseExtractionCandidate('```json\n{"questions":[]}\n```');
	assert.equal(result.ok, true);
});

test("semantic validation issues are returned for retry feedback", () => {
	const result = parseExtractionCandidate(
		JSON.stringify({
			questions: [
				{
					id: "duplicate",
					prompt: "First?",
					options: [{ value: "a", label: "A" }],
				},
				{
					id: "duplicate",
					prompt: "Second?",
					options: [{ value: "b", label: "B" }],
				},
			],
		})
	);

	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(
			result.issues.some((issue) => issue.includes("duplicate")),
			true
		);
	}
});
