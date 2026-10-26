// herdr's pi integration (installed as a pi extension) listens for this
// channel on the extension event bus and reports the pane as blocked until it
// hears `active: false`, so the sidebar shows that the agent is waiting on an
// answer instead of a working spinner.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BLOCKED_CHANNEL = "herdr:blocked";
const BLOCKED_LABEL = "等待回答";

type EventBus = ExtensionAPI["events"];

let events: EventBus | undefined;
let asking = 0;

/** Binds the bus herdr reports on; call once when the extension loads. */
export function bindHerdrEvents(bus: EventBus | undefined): void {
	events = bus;
	asking = 0;
}

/** Marks the session as waiting on an answer while a form is open. */
export function reportAsking(active: boolean): void {
	if (!events) {
		return;
	}
	if (active) {
		asking += 1;
		if (asking === 1) {
			events.emit(BLOCKED_CHANNEL, {
				active: true,
				label: BLOCKED_LABEL,
			});
		}
		return;
	}
	if (asking === 0) {
		return;
	}
	asking -= 1;
	if (asking === 0) {
		events.emit(BLOCKED_CHANNEL, { active: false });
	}
}
