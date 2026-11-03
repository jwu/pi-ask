import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// pi reads this package's CHANGELOG.md to decide whether to show an
// "Extension Updates" notice: it reports every heading whose version is
// greater than the version it recorded last time, then records the current
// package.json version. A heading newer than the package can never be caught
// up with, so the same notes repeat on every launch. Pre-fork history from
// @eko24ive/pi-ask caused exactly that; keep it archived instead.

const CHANGELOG = "CHANGELOG.md";
const UPSTREAM_ARCHIVE = "CHANGELOG-upstream.md";
const HEADING_PATTERN = /^#{1,6}\s+\[?(\d+)\.(\d+)\.(\d+)\]?/;

type Version = [major: number, minor: number, patch: number];

function readRepoFile(name: string): string {
	return readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
}

function packageVersion(): Version {
	const pkg = JSON.parse(readRepoFile("package.json")) as { version: string };
	const [major, minor, patch] = pkg.version.split(".").map(Number);
	return [major, minor, patch];
}

function headingVersions(markdown: string): Version[] {
	const versions: Version[] = [];

	for (const line of markdown.split("\n")) {
		const match = HEADING_PATTERN.exec(line);
		if (match) {
			versions.push([
				Number.parseInt(match[1], 10),
				Number.parseInt(match[2], 10),
				Number.parseInt(match[3], 10),
			]);
		}
	}

	return versions;
}

function compare(a: Version, b: Version): number {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function format(version: Version): string {
	return version.join(".");
}

test("changelog headings never exceed the package version", () => {
	const current = packageVersion();
	const versions = headingVersions(readRepoFile(CHANGELOG));

	assert.ok(
		versions.length > 0,
		`${CHANGELOG} should keep the fork-line release history`
	);

	for (const version of versions) {
		assert.ok(
			compare(version, current) <= 0,
			`${CHANGELOG} has a ${format(version)} heading but package.json is ${format(current)}; move pre-fork history to ${UPSTREAM_ARCHIVE} instead`
		);
	}
});

test("upstream history stays out of the published changelog", () => {
	const published = readRepoFile(CHANGELOG).toLowerCase();

	assert.ok(
		published.includes(UPSTREAM_ARCHIVE.toLowerCase()),
		`${CHANGELOG} should point at ${UPSTREAM_ARCHIVE}`
	);
	assert.ok(
		headingVersions(readRepoFile(UPSTREAM_ARCHIVE)).length > 0,
		`${UPSTREAM_ARCHIVE} should keep the pre-fork entries`
	);
});
