import { StringEnum } from "@earendil-works/pi-ai";
import type { Static } from "typebox";
import { Type } from "typebox";

const AskToolOptionSchema = Type.Object(
	{
		label: Type.String({
			maxLength: 60,
			pattern: "\\S",
			description: "Short visible option label (1-5 words)",
		}),
		description: Type.String({
			pattern: "\\S",
			description: "What the choice means and its trade-offs",
		}),
		preview: Type.Optional(
			Type.String({
				description: "Markdown preview for a single-select option",
			})
		),
		recommended: Type.Optional(
			Type.Boolean({
				description:
					"Mark a grounded recommendation and explain it in the description",
			})
		),
	},
	{ additionalProperties: false }
);

export const AskToolParamsSchema = Type.Object(
	{
		questions: Type.Array(
			Type.Object(
				{
					header: Type.String({
						maxLength: 16,
						pattern: "\\S",
						description: "Short tab label",
					}),
					question: Type.String({
						pattern: "\\S",
						description: "Ask about one concrete decision",
					}),
					options: Type.Array(AskToolOptionSchema, {
						minItems: 2,
						maxItems: 4,
					}),
					multiSelect: Type.Optional(
						Type.Boolean({
							description: "Allow more than one answer; defaults to false",
						})
					),
				},
				{ additionalProperties: false }
			),
			{ minItems: 1, maxItems: 4 }
		),
	},
	{ additionalProperties: false }
);

export type AskToolParams = Static<typeof AskToolParamsSchema>;

const AskOptionSchema = Type.Object({
	value: Type.String({
		description:
			"Required machine-readable value returned for this option in the result",
	}),
	label: Type.String({
		description: "Required short visible option label shown in the list",
	}),
	description: Type.Optional(
		Type.String({
			description: "Optional one-line explanation to help the user choose",
		})
	),
	preview: Type.Optional(
		Type.String({
			description:
				"Optional preview content shown in the dedicated preview pane for preview questions",
		})
	),
	recommended: Type.Optional(
		Type.Boolean({
			description:
				"Optional presentation marker for a grounded preference; use the description to explain the reason",
		})
	),
});

// Internal question format shared by session storage and answer extraction.
export const AskQuestionSchema = Type.Object({
	id: Type.Optional(
		Type.String({
			description:
				"Required in a complete payload: stable question identifier used as the key in returned answers",
		})
	),
	label: Type.Optional(
		Type.String({
			description: "Short tab label, e.g. Goal, Audience, Tone, Scope",
		})
	),
	prompt: Type.Optional(
		Type.String({
			description:
				"Required in a complete payload: direct question shown to the user; ask about one decision at a time",
		})
	),
	type: Type.Optional(
		StringEnum(["single", "multi", "preview"] as const, {
			description:
				"Question type: `single` means one answer is expected, `multi` means multiple answers could reasonably be selected, and `preview` means options need preview-pane detail. Use `preview` only when every option includes `preview` text; descriptions alone are not enough.",
		})
	),
	required: Type.Optional(
		Type.Boolean({
			description:
				"Advisory only; marks the question as important but never blocks submission",
		})
	),
	options: Type.Optional(
		Type.Array(AskOptionSchema, {
			description:
				"Required in a complete payload: at least one { value, label } option; provide clear, distinct choices and do not add filler options",
		})
	),
});

export const AskParamsSchema = Type.Object({
	title: Type.Optional(
		Type.String({
			description:
				"Optional short title shown above the clarification flow, e.g. README direction",
		})
	),
	questions: Type.Array(AskQuestionSchema, {
		description: "Questions to ask in the interactive clarification flow",
	}),
});

const AnswerExtractionOptionSchema = Type.Object({
	value: Type.String({ description: "Machine-readable option value" }),
	label: Type.String({ description: "Short visible option label" }),
	description: AskOptionSchema.properties.description,
	preview: AskOptionSchema.properties.preview,
	freeform: Type.Optional(
		Type.Boolean({
			description:
				"Use only when the assistant offered no concrete choices and the user should type an answer",
		})
	),
});

const AnswerExtractionQuestionSchema = Type.Object({
	id: Type.String({ description: "Stable snake_case question identifier" }),
	label: AskQuestionSchema.properties.label,
	prompt: Type.String({ description: "Direct question shown to the user" }),
	type: AskQuestionSchema.properties.type,
	required: AskQuestionSchema.properties.required,
	options: Type.Array(AnswerExtractionOptionSchema, {
		description:
			"Choices explicitly offered by the assistant, or one freeform option when the user should type an answer",
		minItems: 1,
	}),
});

export const AnswerExtractionParamsSchema = Type.Object({
	...AskParamsSchema.properties,
	questions: Type.Array(AnswerExtractionQuestionSchema, {
		description: "Questions extracted from the assistant message",
	}),
});
