import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLIPBOARD_MAX_BUFFER = 50 * 1024 * 1024;
const CLIPBOARD_TIMEOUT_MS = 5000;

interface ClipboardCommand {
	args: string[];
	command: string;
}

interface LinuxImageType {
	extension: string;
	mimeType: string;
}

export interface ClipboardImage {
	bytes: Uint8Array;
	extension: string;
}

const LINUX_IMAGE_TYPES: LinuxImageType[] = [
	{ extension: "png", mimeType: "image/png" },
	{ extension: "jpg", mimeType: "image/jpeg" },
	{ extension: "webp", mimeType: "image/webp" },
	{ extension: "gif", mimeType: "image/gif" },
];

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

function readClipboardBuffer(
	command: string,
	args: string[]
): Promise<Buffer | null> {
	return new Promise((resolve) => {
		execFile(
			command,
			args,
			{
				encoding: "buffer",
				maxBuffer: CLIPBOARD_MAX_BUFFER,
				timeout: CLIPBOARD_TIMEOUT_MS,
			},
			(error, stdout) => {
				if (error || !stdout || stdout.length === 0) {
					resolve(null);
					return;
				}
				resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
			}
		);
	});
}

function clipboardImagePath(): string {
	return join(tmpdir(), `pi-ask-clipboard-${randomUUID()}.png`);
}

async function readClipboardImageFile(
	filePath: string
): Promise<ClipboardImage | null> {
	try {
		const bytes = await readFile(filePath);
		if (bytes.length === 0) {
			return null;
		}
		return { bytes, extension: "png" };
	} catch {
		return null;
	}
}

async function removeFile(filePath: string): Promise<void> {
	await rm(filePath, { force: true }).catch(() => undefined);
}

async function readMacClipboardImage(): Promise<ClipboardImage | null> {
	const filePath = clipboardImagePath();
	const quotedPath = filePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	const script = [
		"try",
		"set pngData to the clipboard as «class PNGf»",
		"on error",
		'return "none"',
		"end try",
		`set outFile to open for access POSIX file "${quotedPath}" with write permission`,
		"set eof outFile to 0",
		"write pngData to outFile",
		"close access outFile",
		'return "ok"',
	].join("\n");
	try {
		const { stdout } = await execFileAsync("osascript", ["-e", script], {
			encoding: "utf8",
			timeout: CLIPBOARD_TIMEOUT_MS,
		});
		if (stdout.trim() !== "ok") {
			return null;
		}
		return await readClipboardImageFile(filePath);
	} catch {
		return null;
	} finally {
		await removeFile(filePath);
	}
}

async function readWindowsClipboardImage(): Promise<ClipboardImage | null> {
	const filePath = clipboardImagePath();
	const escapedPath = filePath.replaceAll("'", "''");
	const script = [
		"Add-Type -AssemblyName System.Windows.Forms",
		"Add-Type -AssemblyName System.Drawing",
		`$path = '${escapedPath}'`,
		"$img = [System.Windows.Forms.Clipboard]::GetImage()",
		"if ($img) { $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); Write-Output 'ok' } else { Write-Output 'empty' }",
	].join("; ");
	try {
		const { stdout } = await execFileAsync(
			"powershell.exe",
			["-NoProfile", "-Command", script],
			{ encoding: "utf8", timeout: CLIPBOARD_TIMEOUT_MS }
		);
		if (stdout.trim() !== "ok") {
			return null;
		}
		return await readClipboardImageFile(filePath);
	} catch {
		return null;
	} finally {
		await removeFile(filePath);
	}
}

async function readLinuxClipboardImage(
	env: NodeJS.ProcessEnv = process.env
): Promise<ClipboardImage | null> {
	for (const { extension, mimeType } of LINUX_IMAGE_TYPES) {
		const commands: ClipboardCommand[] = [];
		if (env.WAYLAND_DISPLAY) {
			commands.push({
				args: ["--no-newline", "--type", mimeType],
				command: "wl-paste",
			});
		}
		commands.push({
			args: ["-selection", "clipboard", "-t", mimeType, "-o"],
			command: "xclip",
		});
		for (const { args, command } of commands) {
			const bytes = await readClipboardBuffer(command, args);
			if (bytes) {
				return { bytes: new Uint8Array(bytes), extension };
			}
		}
	}
	return null;
}

/**
 * Read an image from the system clipboard, returning null when the clipboard
 * holds no image. pi's native clipboard addon is not reachable from this
 * package's exports, so the ask flow shells out instead.
 */
export function readClipboardImage(
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = process.env
): Promise<ClipboardImage | null> {
	if (platform === "darwin") {
		return readMacClipboardImage();
	}
	if (platform === "win32") {
		return readWindowsClipboardImage();
	}
	if (platform === "linux") {
		return readLinuxClipboardImage(env);
	}
	return Promise.resolve(null);
}

/**
 * Write a clipboard image to a temp file so the ask answer can reference it by
 * path, mirroring how pi's own editor pastes images.
 */
export async function saveClipboardImage(
	image: ClipboardImage
): Promise<string | null> {
	const filePath = join(
		tmpdir(),
		`pi-ask-clipboard-${randomUUID()}.${image.extension}`
	);
	try {
		await writeFile(filePath, image.bytes);
		return filePath;
	} catch {
		return null;
	}
}

/**
 * Read plain text from the system clipboard, returning null when no clipboard
 * command works.
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
 * Wrap clipboard content in bracketed-paste markers so the editor reuses its
 * own paste handling (line/tab normalization and paste markers for large
 * content) instead of treating every character as a typed key.
 */
export function wrapBracketedPaste(text: string): string {
	return `\x1b[200~${text}\x1b[201~`;
}
