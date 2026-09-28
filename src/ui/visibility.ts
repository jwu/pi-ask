import { truncateToWidth } from "@earendil-works/pi-tui";
import type { AskConfig } from "../config/schema.ts";

interface AskHintTheme {
	fg(color: string, text: string): string;
}

interface CollapsedAskSource {
	config: AskConfig;
	theme: AskHintTheme;
}

/**
 * Bordered hint block rendered in place of the ask flow while it is collapsed,
 * so the collapsed state stays discoverable without taking over the transcript.
 */
export function renderCollapsedAskHint(
	source: CollapsedAskSource,
	width: number
): string[] {
	// Show the binding raw ("alt+a") instead of the capitalized keymap label so
	// the collapsed hint matches the shortcut notation used by other extensions.
	const keys = source.config.keymaps.global.toggleVisibility.join(" / ");
	const label = source.theme.fg("accent", "Ask hidden");
	const hint = source.theme.fg("dim", `· ${keys} to expand`);
	const border = truncateToWidth(
		source.theme.fg("accent", "─".repeat(Math.max(1, width))),
		width
	);
	return [border, truncateToWidth(` ${label} ${hint}`, width), border];
}
