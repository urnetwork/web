// /login-app, what the page draws (src/components/AppApprovalView.tsx), rendered
// to static markup with the real React: only the consent card has an Approve
// button, Cancel comes first, nothing is focused, values are text and never
// markup, and no card carries a link. And what the buttons do: the elements are
// expanded without a DOM, and every button's onClick is called to see that it
// runs the action its label promises, with the click.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadView() {
	const source = fs.readFileSync(
		new URL("../src/components/AppApprovalView.tsx", import.meta.url),
		"utf8",
	);
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			jsx: ts.JsxEmit.ReactJSX,
			esModuleInterop: true,
		},
	});
	const allowed = new Set(["react", "react/jsx-runtime", "lucide-react"]);
	const module = { exports: {} };
	new Function("require", "module", "exports", outputText)(
		(name) => {
			if (!allowed.has(name))
				throw new Error(`unexpected import ${name}`);
			return require(name);
		},
		module,
		module.exports,
	);
	return module.exports.AppApprovalView;
}

const View = loadView();
/** every action the view was asked to run, with what it was handed */
const calls = [];
const actions = Object.fromEntries(
	[
		"onCancel",
		"onApprove",
		"onOpenApp",
		"onSignOut",
		"onUseDefaultServer",
		"onRetry",
		"onReload",
	].map((name) => [
		name,
		(...args) => {
			calls.push({ name, args });
		},
	]),
);
const render = (model) =>
	renderToStaticMarkup(React.createElement(View, { model, actions }));
/** the visible text of some markup: tags gone, entities decoded */
const textOf = (html) =>
	html
		.replace(/<[^>]*>/g, " ")
		.replace(/&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
const buttons = (html) =>
	[...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => ({
		tag: m[0],
		text: m[1].replace(/<[^>]*>/g, "").trim(),
	}));

const consent = (over = {}) => ({
	kind: "consent",
	label: "URnetwork for Windows",
	networkName: "alpha-net",
	armed: true,
	busy: false,
	minting: false,
	problem: null,
	...over,
});

const everyModel = [
	{ kind: "blocked", reason: "framed" },
	{ kind: "blocked", reason: "opener" },
	{ kind: "request", problem: "invalid" },
	{ kind: "request", problem: "stale" },
	{ kind: "request", problem: "unsupported" },
	{ kind: "redirecting" },
	{ kind: "server", apiHost: "api.example.test" },
	{ kind: "checking" },
	{ kind: "identity", problem: "failed" },
	{ kind: "identity", problem: "unreadable" },
	{ kind: "identity", problem: "no-sign-in-method" },
	consent(),
	{ kind: "approved", canOpen: true },
	{ kind: "approved", canOpen: false },
	{ kind: "cancelled" },
	{ kind: "expired" },
	{ kind: "session-changed" },
];

test("the consent card says what the contract says and nothing more: the app, the network, what approving grants, the sign-out note, and the way to another account", () => {
	const html = render(consent());
	const text = textOf(html);
	assert.match(text, /Sign in to URnetwork for Windows\?/);
	assert.match(
		text,
		/URnetwork for Windows is asking to sign in to your network alpha-net \./,
	);
	assert.match(html, />alpha-net</);
	assert.match(
		text,
		/If you approve, that app gets full access to this account, the same as signing in there yourself: balance, plans, payout wallet and settings\./,
	);
	assert.match(
		text,
		/Signing out of this page does not sign that computer out\./,
	);
	assert.match(html, /Not <span[^>]*>alpha-net<\/span>\?/);
	assert.match(
		text,
		/Not alpha-net \? Sign out and use a different account\./,
	);
	// the whole card, word for word: a sentence added to it would show up here
	assert.equal(
		text,
		"Sign in to URnetwork for Windows? " +
			"URnetwork for Windows is asking to sign in to your network alpha-net . " +
			"If you approve, that app gets full access to this account, the same as signing in there yourself: balance, plans, payout wallet and settings. " +
			"Signing out of this page does not sign that computer out. " +
			"Cancel Approve " +
			"Not alpha-net ? Sign out and use a different account.",
	);
});

test("no card says anything about 30 days, a password, a reset, a computer it cannot see, or a code to compare", () => {
	const removed = [
		/30 days/i,
		/password/i,
		/reset/i,
		/end the access/i,
		/this computer/i,
		/\bPC\b/,
		/operating system/i,
		/matches the code/i,
		new RegExp(["check", "\\s?code"].join(""), "i"),
	];
	for (const model of everyCard) {
		const text = textOf(render(model));
		for (const pattern of removed) {
			assert.doesNotMatch(text, pattern, JSON.stringify(model));
		}
	}
});

test("Cancel comes first, Approve comes second, and neither is focused", () => {
	const html = render(consent());
	const all = buttons(html);
	assert.deepEqual(
		all.map((b) => b.text),
		["Cancel", "Approve", "Sign out and use a different account."],
	);
	assert.equal(/autofocus/i.test(html), false);
	assert.equal(/tabindex/i.test(html), false, "no tab order games");
	for (const b of all) assert.match(b.tag, /type="button"/);
	assert.equal(/<form\b/.test(html), false);
});

test("Approve is inert until the card is armed, and while it is busy; Cancel waits for a mint and for nothing else; Sign out waits for both", () => {
	const isDisabled = (html, label) =>
		/\sdisabled=""/.test(
			buttons(html).find((b) => b.text.startsWith(label)).tag,
		);
	assert.equal(
		isDisabled(render(consent({ armed: false })), "Approve"),
		true,
	);
	assert.equal(
		isDisabled(render(consent({ armed: true })), "Approve"),
		false,
	);
	// idle: only Approve may wait for the inert time
	const idle = render(consent({ armed: false }));
	assert.equal(isDisabled(idle, "Cancel"), false, "Cancel never waits");
	assert.equal(isDisabled(idle, "Sign out"), false);

	// Approve was clicked and the sealing code is still loading: no code exists yet
	const loading = render(consent({ busy: true }));
	assert.equal(isDisabled(loading, "Approving"), true);
	assert.equal(
		isDisabled(loading, "Cancel"),
		false,
		"nothing is being minted: the person may still say no",
	);
	assert.equal(isDisabled(loading, "Sign out"), true);

	// a code is being asked for: it cannot be called back
	const minting = render(consent({ busy: true, minting: true }));
	assert.equal(isDisabled(minting, "Approving"), true);
	assert.equal(
		isDisabled(minting, "Cancel"),
		true,
		"Cancel cannot race a mint",
	);
	assert.equal(
		isDisabled(minting, "Sign out"),
		true,
		"signing out cannot race a mint either",
	);
});

test("an error shows as an alert; it names no code and no state", () => {
	assert.equal(render(consent()).includes('role="alert"'), false);
	const failed = render(consent({ problem: "failed" }));
	assert.match(failed, /role="alert"/);
	assert.match(
		textOf(failed),
		/We couldn't approve this right now\. Try again\./,
	);
	const many = render(consent({ problem: "too-many" }));
	assert.match(many, /role="alert"/);
	assert.match(
		textOf(many),
		/Too many approvals are pending\. Try again later\./,
	);
	// a code was minted that could not be sent: no invitation to try again, only to reload
	const broken = render(consent({ problem: "broken", armed: false }));
	assert.match(broken, /role="alert"/);
	assert.match(textOf(broken), /Reload this page and approve again\./);
	assert.doesNotMatch(textOf(broken), /Try again/);
	assert.doesNotMatch(textOf(failed), /Reload/);
});

test("the network name and the api host are text, never markup", () => {
	const hostile = `</span><img src=x onerror=alert(1)><script>alert(2)</script>"'&`;
	const html = render(consent({ networkName: hostile }));
	assert.equal(/<img\b/i.test(html), false);
	assert.equal(/<script\b/i.test(html), false);
	assert.equal(
		/onerror=/i.test(html.replace(/&quot;|&#x27;|&amp;|&lt;|&gt;/g, "")) &&
			/<img/i.test(html),
		false,
	);
	assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
	const server = render({ kind: "server", apiHost: hostile });
	assert.equal(/<img\b/i.test(server), false);
	assert.ok(server.includes("&lt;script&gt;"));
});

test("only the consent card has an Approve button, and no card has a link", () => {
	for (const model of everyModel) {
		const html = render(model);
		const label = JSON.stringify(model);
		const texts = buttons(html).map((b) => b.text);
		assert.equal(
			texts.some((t) => /^Approv/.test(t)),
			model.kind === "consent",
			label,
		);
		assert.equal(/<a\b/i.test(html), false, `no link: ${label}`);
		assert.equal(/href=/i.test(html), false, `no href: ${label}`);
		assert.equal(/\bsrc=/i.test(html), false, `no src: ${label}`);
		assert.equal(
			/<iframe|<form|<input|<textarea/i.test(html),
			false,
			label,
		);
		assert.equal(/autofocus/i.test(html), false, label);
		assert.equal(
			/urnetwork:\/\//.test(html),
			false,
			`no address in the markup: ${label}`,
		);
	}
});

test("the cards with nothing to do have no button at all", () => {
	for (const model of [
		{ kind: "blocked", reason: "framed" },
		{ kind: "blocked", reason: "opener" },
		{ kind: "request", problem: "invalid" },
		{ kind: "request", problem: "stale" },
		{ kind: "request", problem: "unsupported" },
		{ kind: "redirecting" },
		{ kind: "checking" },
		{ kind: "approved", canOpen: false },
		{ kind: "cancelled" },
		{ kind: "expired" },
	]) {
		assert.deepEqual(buttons(render(model)), [], JSON.stringify(model));
	}
});

test("the messages are the ones in the contract", () => {
	const say = (model) => textOf(render(model));
	assert.match(
		say({ kind: "request", problem: "invalid" }),
		/This sign-in link isn't valid\. Start again from the URnetwork app\./,
	);
	assert.match(
		say({ kind: "request", problem: "stale" }),
		/This request has expired\. Start again from URnetwork\./,
	);
	assert.match(
		say({ kind: "expired" }),
		/This request has expired\. Start again from URnetwork\./,
	);
	assert.match(
		say({ kind: "request", problem: "unsupported" }),
		/This version of URnetwork isn't supported yet\. Update the app and try again\./,
	);
	assert.match(
		say({ kind: "blocked", reason: "framed" }),
		/cannot be used inside another page/,
	);
	assert.match(
		say({ kind: "blocked", reason: "opener" }),
		/another page opened/,
	);
	assert.match(
		say({ kind: "cancelled" }),
		/Cancelled\. Nothing was shared\. You can close this tab\./,
	);
	assert.match(
		say({ kind: "approved", canOpen: true }),
		/Approved\. Return to URnetwork to finish signing in\. If it did not open, choose Open URnetwork, or start again from the app\./,
	);
	assert.deepEqual(
		buttons(render({ kind: "approved", canOpen: true })).map((b) => b.text),
		["Open URnetwork"],
	);
	// after the minute is up the button is gone, and the words no longer point at it
	const expired = say({ kind: "approved", canOpen: false });
	assert.match(
		expired,
		/Approved\. Return to URnetwork to finish signing in\. If it did not open, start again from the app\./,
	);
	assert.doesNotMatch(expired, /Open URnetwork/);
	assert.deepEqual(
		buttons(render({ kind: "identity", problem: "failed" })).map(
			(b) => b.text,
		),
		["Try again", "Sign out and use a different account."],
	);
	assert.deepEqual(
		buttons(render({ kind: "identity", problem: "no-sign-in-method" })).map(
			(b) => b.text,
		),
		["Sign out and use a different account."],
	);
	assert.deepEqual(
		buttons(render({ kind: "server", apiHost: "x" })).map((b) => b.text),
		["Use the default server"],
	);
	assert.deepEqual(
		buttons(render({ kind: "session-changed" })).map((b) => b.text),
		["Reload"],
	);
});

test("every card says exactly what it says, word for word, including the ones the contract does not specify", () => {
	const SIGN_OUT = "Sign out and use a different account.";
	const cards = [
		[
			{ kind: "blocked", reason: "framed" },
			"Open this from URnetwork For your security this page cannot be used inside another page. Start again from the URnetwork app.",
		],
		[
			{ kind: "blocked", reason: "opener" },
			"Open this from URnetwork For your security this page cannot be used from a window that another page opened. Start again from the URnetwork app.",
		],
		[
			{ kind: "request", problem: "invalid" },
			"Invalid request This sign-in link isn't valid. Start again from the URnetwork app.",
		],
		[
			{ kind: "request", problem: "stale" },
			"Request expired This request has expired. Start again from URnetwork.",
		],
		[
			{ kind: "request", problem: "unsupported" },
			"Update URnetwork This version of URnetwork isn't supported yet. Update the app and try again.",
		],
		[{ kind: "redirecting" }, "Sign in first Taking you to sign in..."],
		[
			{ kind: "server", apiHost: "api.example.test" },
			"Different API server This browser is set to use a different API server, api.example.test . Approving a sign-in only works with the default server. Use the default server",
		],
		[{ kind: "checking" }, "Checking your account One moment..."],
		[
			{ kind: "identity", problem: "failed" },
			`Couldn't check your account We couldn't check your account right now. Try again. Try again ${SIGN_OUT}`,
		],
		[
			{ kind: "identity", problem: "unreadable" },
			`Couldn't check your account We couldn't tell which account is signed in here. Sign out and sign in again. ${SIGN_OUT}`,
		],
		[
			{ kind: "identity", problem: "no-sign-in-method" },
			`No sign-in method This account has no sign-in method, so it can't sign in other apps. Add one in Account Settings, then start again from the app, or use a different account. ${SIGN_OUT}`,
		],
		[
			{ kind: "approved", canOpen: true },
			"Approved Approved. Return to URnetwork to finish signing in. If it did not open, choose Open URnetwork, or start again from the app. Open URnetwork",
		],
		[
			{ kind: "approved", canOpen: false },
			"Approved Approved. Return to URnetwork to finish signing in. If it did not open, start again from the app.",
		],
		[
			{ kind: "cancelled" },
			"Cancelled Cancelled. Nothing was shared. You can close this tab.",
		],
		[
			{ kind: "expired" },
			"Request expired This request has expired. Start again from URnetwork.",
		],
		[
			{ kind: "session-changed" },
			"Account changed The account signed in to this browser changed while this page was open. Reload to see which account would be signed in. Reload",
		],
	];
	for (const [model, expected] of cards) {
		assert.equal(textOf(render(model)), expected, JSON.stringify(model));
	}
	// the one line of the consent card that changes with what went wrong
	const alertOf = (problem) =>
		/<div role="alert"[^>]*>([\s\S]*?)<\/div>/.exec(
			render(consent({ problem })),
		)?.[1];
	assert.equal(alertOf(null), undefined);
	assert.equal(
		alertOf("failed"),
		"We couldn&#x27;t approve this right now. Try again.",
	);
	assert.equal(
		alertOf("too-many"),
		"Too many approvals are pending. Try again later.",
	);
	assert.equal(alertOf("broken"), "Reload this page and approve again.");
});

// ----- what the buttons do -----

/** The elements of a render with every component called until only host
 * elements (button, p, span, svg) are left, so a test can read their props and
 * call their handlers without a DOM. Text stays as strings. */
function expand(node) {
	if (node === null || node === undefined || typeof node === "boolean") {
		return [];
	}
	if (typeof node === "string" || typeof node === "number") {
		return [String(node)];
	}
	if (Array.isArray(node)) return node.flatMap(expand);
	const { type, props } = node;
	if (type === React.Fragment) return expand(props.children);
	if (typeof type === "function") return expand(type(props));
	if (typeof type === "string") {
		return [{ tag: type, props, children: expand(props.children) }];
	}
	// forwardRef and memo components, which is what the icons are
	if (type !== null && typeof type === "object") {
		if (typeof type.render === "function") {
			return expand(type.render(props, null));
		}
		if (type.type !== undefined) {
			return expand({ ...node, type: type.type });
		}
	}
	throw new Error(`cannot expand an element of type ${String(type)}`);
}

const textIn = (nodes) =>
	nodes.map((n) => (typeof n === "string" ? n : textIn(n.children))).join("");

/** every host element the view draws for a model, in document order */
function hostNodes(model) {
	const all = [];
	const visit = (nodes) => {
		for (const n of nodes) {
			if (typeof n === "string") continue;
			all.push(n);
			visit(n.children);
		}
	};
	visit(expand(React.createElement(View, { model, actions })));
	return all;
}

/** which action each button must run, by its label */
const WIRING = [
	[/^Cancel$/, "onCancel"],
	[/^Approv(e|ing\.\.\.)$/, "onApprove"],
	[/^Open URnetwork$/, "onOpenApp"],
	[/^Sign out and use a different account\.$/, "onSignOut"],
	[/^Try again$/, "onRetry"],
	[/^Use the default server$/, "onUseDefaultServer"],
	[/^Reload$/, "onReload"],
];
/** The three actions that decide something take the click itself: the page
 * ignores a click that is not a trusted one, so a view that drops the click
 * breaks them. */
const TAKES_THE_CLICK = new Set(["onCancel", "onApprove", "onOpenApp"]);

const everyCard = [
	...everyModel,
	consent({ armed: false }),
	consent({ busy: true }),
	consent({ problem: "failed" }),
	consent({ problem: "too-many" }),
	consent({ problem: "broken", armed: false }),
];

test("every button runs the action it is labelled for, on every card, and the three that decide are handed the click", () => {
	const reached = new Set();
	for (const model of everyCard) {
		for (const node of hostNodes(model)) {
			const where = `${node.tag} on ${JSON.stringify(model)}`;
			const handlers = Object.keys(node.props).filter((key) =>
				/^on[A-Z]/.test(key),
			);
			if (node.tag !== "button") {
				assert.deepEqual(
					handlers,
					[],
					`${where}: only buttons can be acted on`,
				);
				continue;
			}
			assert.deepEqual(handlers, ["onClick"], `${where}: one handler`);

			const label = textIn(node.children).trim();
			const wiring = WIRING.find(([pattern]) => pattern.test(label));
			assert.ok(
				wiring,
				`a button with no known action: "${label}" on ${JSON.stringify(model)}`,
			);
			const [, name] = wiring;
			assert.equal(
				typeof node.props.onClick,
				"function",
				`"${label}" on ${JSON.stringify(model)} has an onClick`,
			);

			const click = { isTrusted: true };
			const before = calls.length;
			node.props.onClick(click);
			assert.deepEqual(
				calls.slice(before).map((call) => call.name),
				[name],
				`"${label}" on ${JSON.stringify(model)} runs ${name}, once`,
			);
			if (TAKES_THE_CLICK.has(name)) {
				assert.equal(
					calls.at(-1).args[0],
					click,
					`"${label}" on ${JSON.stringify(model)} hands the click to ${name}`,
				);
			}
			reached.add(name);
		}
	}
	assert.deepEqual(
		[...reached].sort(),
		Object.keys(actions).sort(),
		"every action can be reached from a button",
	);
});
