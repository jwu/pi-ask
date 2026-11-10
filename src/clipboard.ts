import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLIPBOARD_MAX_BUFFER = 50 * 1024 * 1024;
const CLIPBOARD_TIMEOUT_MS = 5000;

interface ClipboardCommand {
	args: string[];
	command: string;
}

function clipboardReadCommands(
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = process.env
): ClipboardCommand[] {
	if (platform === "darwin") {
		return [{ args: [], command: "pbpaste" }];
	}
	if (platform === "win32") {
		return [
			{
				args: ["-NoProfile", "-Command", "Get-Clipboard"],
				command: "powershell.exe",
			},
		];
	}
	if (platform === "linux") {
		const commands: ClipboardCommand[] = [];
		if (env.WAYLAND_DISPLAY) {
			commands.push({
				args: ["--no-newline", "--type", "text"],
				command: "wl-paste",
			});
		}
		commands.push({
			args: ["-selection", "clipboard", "-o"],
			command: "xclip",
		});
		commands.push({ args: ["--clipboard", "--output"], command: "xsel" });
		return commands;
	}
	return [];
}

/**
 * Read plain text from the system clipboard, returning null when no clipboard
 * command works. pi's own clipboard helper relies on a native addon that is not
 * reachable from this package's exports, so the ask flow shells out instead.
 */
export async function readClipboardText(): Promise<string | null> {
	for (const { args, command } of clipboardReadCommands()) {
		try {
			const { stdout } = await execFileAsync(command, args, {
				encoding: "utf8",
				maxBuffer: CLIPBOARD_MAX_BUFFER,
				timeout: CLIPBOARD_TIMEOUT_MS,
			});
			if (stdout.length > 0) {
				return stdout;
			}
		} catch {
			// Try the next clipboard command for this platform.
		}
	}
	return null;
}

/**
 * Wrap clipboard text in bracketed-paste markers so the editor reuses its own
 * paste handling (line/tab normalization and paste markers for large content)
 * instead of treating every character as a typed key.
 */
export function wrapBracketedPaste(text: string): string {
	return `\x1b[200~${text}\x1b[201~`;
}
