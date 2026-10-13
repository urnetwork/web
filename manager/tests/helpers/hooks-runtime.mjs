// A minimal hooks runtime, so a React function component (a page, Layout) can be
// run by node --test without a renderer or a DOM: useState, useEffect,
// useCallback and useRef, a render that runs the component and then the effects
// whose dependencies changed, and a flush that renders again while state changed
// (and first waits for the promises it was told about with track).
//
// `strict` makes it do what React's StrictMode does in a development build, and
// a production build does not: when the component mounts, every effect is set up,
// torn down and set up again (state and refs are kept), and a state initializer is
// called twice. A component that is only right when each effect runs once is not
// right in development; the page test and the Layout test run both ways.
//
// Nothing here knows about the component under test; the test hands it the
// `react` object as the module "react" and mounts the component's function.
// Not a test file (the test script only runs tests/*.test.mjs).

const sameDeps = (a, b) =>
	Array.isArray(a) &&
	Array.isArray(b) &&
	a.length === b.length &&
	a.every((v, i) => Object.is(v, b[i]));

/** a turn of the event loop, for the promises a component's effects start */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export function createHooksRuntime({ strict = false } = {}) {
	const slots = [];
	let cursor = 0;
	let queue = [];
	let dirty = false;
	let component = null;
	let latest = null;
	let mounted = false;
	const pending = new Set();

	const react = {
		useState(initial) {
			const i = cursor++;
			if (!slots[i]) {
				let first;
				if (typeof initial === "function") {
					first = initial();
					// StrictMode calls an initializer twice and keeps one answer
					if (strict) initial();
				} else {
					first = initial;
				}
				const slot = { value: first };
				slot.set = (next) => {
					const value =
						typeof next === "function" ? next(slot.value) : next;
					if (!Object.is(value, slot.value)) {
						slot.value = value;
						dirty = true;
					}
				};
				slots[i] = slot;
			}
			return [slots[i].value, slots[i].set];
		},
		useEffect(fn, deps) {
			const i = cursor++;
			const slot = slots[i];
			if (slot && deps && sameDeps(slot.deps, deps)) return;
			const entry = slot ?? (slots[i] = {});
			entry.deps = deps;
			queue.push({ entry, fn });
		},
		useCallback(fn, deps) {
			const i = cursor++;
			if (slots[i] && sameDeps(slots[i].deps, deps)) return slots[i].fn;
			slots[i] = { deps, fn };
			return fn;
		},
		useRef(initial) {
			const i = cursor++;
			if (!slots[i]) slots[i] = { ref: { current: initial } };
			return slots[i].ref;
		},
	};

	const render = () => {
		if (component === null) throw new Error("mount a component first");
		cursor = 0;
		latest = component();
		const run = queue;
		queue = [];
		const firstMount = !mounted;
		mounted = true;
		for (const { entry, fn } of run) {
			entry.cleanup?.();
			entry.cleanup = fn() ?? undefined;
		}
		if (strict && firstMount) {
			// every effect is torn down, then set up again, in order
			for (const { entry } of run) {
				entry.cleanup?.();
				entry.cleanup = undefined;
			}
			for (const { entry, fn } of run) entry.cleanup = fn() ?? undefined;
		}
		return latest;
	};
	/** what runs on another thread is not done when the turn is: wait for it, but not for ever */
	const drainPending = async () => {
		if (pending.size === 0) return;
		let timer;
		const giveUp = new Promise((resolve) => {
			timer = setTimeout(resolve, 2000);
		});
		await Promise.race([Promise.allSettled([...pending]), giveUp]);
		clearTimeout(timer);
	};
	const flush = async () => {
		for (let i = 0; i < 30; i++) {
			await settle();
			await drainPending();
			if (!dirty && queue.length === 0) break;
			dirty = false;
			render();
		}
	};

	return {
		/** the object to hand out as the module "react" */
		react,
		/** the component's function, called with no props on every render */
		mount(fn) {
			component = fn;
		},
		render,
		flush,
		/** something outside the hooks changed (a fake context): the next flush renders again */
		invalidate() {
			dirty = true;
		},
		/** Hand over a promise the component waits on that a turn of the event loop
		 * does not settle (a WebCrypto digest runs on another thread): flush waits
		 * for it before it decides that nothing is left to render. */
		track(promise) {
			pending.add(promise);
			const done = () => pending.delete(promise);
			promise.then(done, done);
			return promise;
		},
		/** what the last render returned */
		latest: () => latest,
	};
}
