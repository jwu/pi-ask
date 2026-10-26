import assert from "node:assert/strict";
import test from "node:test";
import { bindHerdrEvents, reportAsking } from "../src/herdr-state.ts";

class TestEventBus {
	readonly events: Array<{ channel: string; data: unknown }> = [];

	emit(channel: string, data: unknown): void {
		this.events.push({ channel, data });
	}
}

function bind(bus?: TestEventBus): void {
	bindHerdrEvents(bus as never);
}

test("reportAsking tells herdr once per prompt and clears it afterwards", () => {
	const bus = new TestEventBus();
	bind(bus);

	reportAsking(true);
	reportAsking(false);

	assert.deepEqual(bus.events, [
		{ channel: "herdr:blocked", data: { active: true, label: "等待回答" } },
		{ channel: "herdr:blocked", data: { active: false } },
	]);
	bind();
});

test("nested prompts keep the pane blocked until the last one closes", () => {
	const bus = new TestEventBus();
	bind(bus);

	reportAsking(true);
	reportAsking(true);
	reportAsking(false);
	assert.equal(bus.events.length, 1);

	reportAsking(false);
	assert.deepEqual(bus.events.at(-1), {
		channel: "herdr:blocked",
		data: { active: false },
	});
	bind();
});

test("an unmatched clear emits nothing", () => {
	const bus = new TestEventBus();
	bind(bus);

	reportAsking(false);
	reportAsking(false);

	assert.equal(bus.events.length, 0);
	bind();
});

test("reporting without a bound bus is a no-op", () => {
	bind();

	assert.doesNotThrow(() => {
		reportAsking(true);
		reportAsking(false);
	});
});

test("binding a bus drops the count carried over from the previous session", () => {
	const first = new TestEventBus();
	bind(first);
	reportAsking(true);

	const second = new TestEventBus();
	bind(second);
	reportAsking(false);
	assert.equal(second.events.length, 0);

	reportAsking(true);
	assert.deepEqual(second.events.at(-1), {
		channel: "herdr:blocked",
		data: { active: true, label: "等待回答" },
	});
	bind();
});
