import { Value } from "typebox/value";
import { OTHER_OPTION_LABEL } from "./constants/text.ts";
import { AskToolParamsSchema } from "./schema.ts";
import type { AskParams, AskValidationIssue } from "./types.ts";

const RESERVED_LABELS = new Set([
	"other",
	"type something.",
	OTHER_OPTION_LABEL.toLowerCase(),
]);

export function parseAskToolParams(
	input: unknown
):
	| { params: AskParams; issues?: never }
	| { issues: AskValidationIssue[]; params?: never } {
	if (!Value.Check(AskToolParamsSchema, input)) {
		return {
			issues: [...Value.Errors(AskToolParamsSchema, input)].map((issue) => ({
				path: issue.instancePath || "questions",
				message: issue.message,
			})),
		};
	}

	const issues: AskValidationIssue[] = [];
	const questions = new Set<string>();
	const normalized = input.questions.map((question, questionIndex) => {
		const path = `questions[${questionIndex}]`;
		const prompt = question.question.trim();
		if (questions.has(prompt)) {
			issues.push({
				path: `${path}.question`,
				message: "Duplicate question text",
			});
		}
		questions.add(prompt);

		const labels = new Set<string>();
		const options = question.options.map((option, optionIndex) => {
			const label = option.label.trim();
			const labelPath = `${path}.options[${optionIndex}].label`;
			if (RESERVED_LABELS.has(label.toLowerCase())) {
				issues.push({
					path: labelPath,
					message: "Reserved custom answer label",
				});
			} else if (labels.has(label)) {
				issues.push({ path: labelPath, message: "Duplicate option label" });
			}
			labels.add(label);
			return {
				...option,
				label,
				preview: question.multiSelect
					? undefined
					: option.preview?.trim() || undefined,
				value: `option_${optionIndex + 1}`,
			};
		});
		const singleType = options.some((option) => option.preview)
			? "preview"
			: "single";
		const type = question.multiSelect ? "multi" : singleType;
		return {
			id: `q${questionIndex + 1}`,
			label: question.header.trim(),
			prompt,
			type,
			options,
		} satisfies AskParams["questions"][number];
	});
	return issues.length ? { issues } : { params: { questions: normalized } };
}
