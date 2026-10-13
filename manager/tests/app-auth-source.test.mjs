// /login-app, source pins: facts about the code and the files that behaviour
// tests cannot see. No HTML sinks, no redirect parameter, no bridge to another
// window, one place the page navigates, the NaCl code in its own lazy chunk,
// exact dependency pins, the descriptor file, what was left out on purpose
// (the last tests), and the extension's files as they were. Comments are
// removed before scanning, so a sentence that explains a rule cannot trip it.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

import { APP_CONTRACTS, APP_PLATFORMS } from "../src/services/appAuth.ts";
import { source } from "./helpers/app-request.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const managerRoot = new URL("../", import.meta.url);

/** emitted code of a source file with its comments and types gone */
function code(relative) {
	const { outputText } = ts.transpileModule(source(relative), {
		fileName: relative,
		compilerOptions: {
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.Preserve,
			removeComments: true,
		},
	});
	return outputText;
}

const NEW_FILES = [
	"src/services/appAuth.ts",
	"src/services/appSeal.ts",
	"src/services/appRequestStash.ts",
	"src/services/appApproval.ts",
	"src/services/appApprovalView.ts",
	"src/components/AppApprovalView.tsx",
	"src/pages/LoginApp.tsx",
	// keeps a session with the server that issued it (and the auth context that uses it)
	"src/services/sessionBinding.ts",
];
const PAGE_FILES = [
	"src/pages/LoginApp.tsx",
	"src/components/AppApprovalView.tsx",
];

function allSources(dir = "src") {
	const out = [];
	for (const entry of fs.readdirSync(new URL(`${dir}/`, managerRoot), {
		withFileTypes: true,
	})) {
		const relative = `${dir}/${entry.name}`;
		if (entry.isDirectory()) out.push(...allSources(relative));
		else if (
			/\.(ts|tsx)$/.test(entry.name) &&
			!entry.name.endsWith(".d.ts")
		)
			out.push(relative);
	}
	return out;
}

test("no HTML sink, no code from a string, no bridge to another window", () => {
	const forbidden = [
		/dangerouslySetInnerHTML/,
		/\.innerHTML\b/,
		/\.outerHTML\b/,
		/insertAdjacentHTML/,
		/document\.write/,
		/\beval\s*\(/,
		/new\s+Function\b/,
		/\bsetTimeout\s*\(\s*["'`]/,
		/\bsetInterval\s*\(\s*["'`]/,
		/postMessage/,
		/\.opener\s*\./,
		/window\.parent/,
		/window\.frames/,
		/\bBroadcastChannel\b/,
		/\bMessageChannel\b/,
		/window\.name\b/,
		/srcDoc/i,
		/createContextualFragment/,
		/DOMParser/,
		/document\.cookie/,
		/window\.open\s*\(/,
		/navigator\.sendBeacon/,
		/\bXMLHttpRequest\b/,
		/\bWebSocket\b/,
		/\bEventSource\b/,
	];
	for (const file of NEW_FILES) {
		const text = code(file);
		for (const pattern of forbidden) {
			assert.doesNotMatch(
				text,
				pattern,
				`${file} must not contain ${pattern}`,
			);
		}
	}
});

test("no redirect parameter exists, and nothing reads the query for the request", () => {
	for (const file of NEW_FILES) {
		let text = code(file);
		if (file === "src/services/appRequestStash.ts") {
			// the one place the extension's own sign-in key is named, to take a leftover one away
			assert.equal(text.split("extension_return_to").length - 1, 1);
			text = text.replace("extension_return_to", "");
		}
		for (const name of [
			"redirect_uri",
			"redirect_link",
			"redirectUri",
			"redirectLink",
			"return_to",
			"returnTo",
			"callback",
		]) {
			assert.equal(
				text.includes(name),
				false,
				`${file} mentions ${name}`,
			);
		}
	}
	for (const file of [
		"src/pages/LoginApp.tsx",
		"src/services/appAuth.ts",
		"src/services/appApproval.ts",
		"src/services/appApprovalView.ts",
	]) {
		const text = code(file);
		assert.doesNotMatch(
			text,
			/useSearchParams|URLSearchParams|location\.search|location\.href/,
			file,
		);
	}
});

test("the page is guarded: top window, no opener, trusted clicks only", () => {
	const page = code("src/pages/LoginApp.tsx");
	assert.match(page, /window\.self/);
	assert.match(page, /window\.top/);
	assert.match(page, /window\.opener/);
	assert.match(page, /evaluateAppGate\(/);
	assert.equal(
		page.split("event.isTrusted").length - 1,
		5,
		"Approve, Cancel, Open URnetwork, Use the default server and Switch each require a trusted click",
	);
	assert.doesNotMatch(
		page,
		/autoFocus|\.focus\(\)|\.click\(\)|dispatchEvent/,
	);
	assert.doesNotMatch(
		code("src/components/AppApprovalView.tsx"),
		/autoFocus|tabIndex|\.focus\(\)/,
	);
	assert.match(page, /const APPROVE_DELAY_MS = 800;/);
	assert.match(page, /const OPEN_BUTTON_MS = 60_000;/);
	// the server the request is for is judged in one place, from the live server and the
	// build's default (the page's own origin stands in for its address)
	assert.match(
		page,
		/const serverFits = \(request\) => isServerForRequest\(request, getApiBase\(\), DEFAULT_API_BASE, window\.location\.origin\);/,
	);
	assert.doesNotMatch(page, /getApiBase\(\) === DEFAULT_API_BASE/);
});

/** the emitted code with every run of white space made one space, for patterns that span lines */
const flat = (text) => text.replace(/\s+/g, " ");

test("the server the request is for is judged before the sign-in and before any call, and the controller asks the same question at the click", () => {
	const page = flat(code("src/pages/LoginApp.tsx"));
	// one answer, used by the render, the two effects that may send the session or the tab somewhere,
	// and the controller's port
	assert.ok(
		page.includes(
			"const serverMatches = request !== null && serverFits(request);",
		),
	);
	assert.ok(page.includes("serverMatches: serverFits,"));
	assert.ok(
		page.includes(
			'const needsSignIn = gate === "ok" && request !== null && serverMatches && !isAuthenticated;',
		),
	);
	assert.ok(
		page.includes(
			'const checking = gate === "ok" && request !== null && isAuthenticated && serverMatches && done === null;',
		),
	);
	// the account check is made in one place, and it is the one under `checking`
	assert.equal(page.split("fetchNetworkUser(token, signal)").length - 1, 1);
	assert.ok(
		page.includes(
			'if (!checking || !token) return; if (readStoredToken() !== token) { setToken(null); return; } let current = true; const cancel = new AbortController(); setIdentity({ kind: "loading" }); void withTimeout((signal) => fetchNetworkUser(token, signal), cancel.signal)',
		),
	);
	// the page never sends a session its stored copy no longer backs: the check comes first, and a
	// run that is torn down calls its request back
	assert.ok(
		page.indexOf("readStoredToken() !== token") <
			page.indexOf("fetchNetworkUser(token, signal)"),
		"the stored session is asked before the request goes out",
	);
	assert.ok(
		page.includes(
			'current = false; cancel.abort(new Error("called back: this run of the account check was replaced"));',
		),
		"and a run that is torn down calls its request back, saying why",
	);
	assert.ok(
		page.includes("}, [checking, token, retry, endSession, setToken]);"),
		"the check runs again whenever the session, the server or the retry changes",
	);
	// the way to sign-in is taken in one place, and it is the one under `needsSignIn`
	assert.equal(page.split('window.location.replace("/")').length - 1, 1);
	assert.ok(
		page.includes(
			'if (needsSignIn) { markSignInPending(appRequestStorage(), Date.now()); window.location.replace("/"); }',
		),
	);
	// the view model gets the same answer, and takes the server before the sign-in
	assert.ok(page.includes("serverMatches, apiHost: hostOf(getApiBase()),"));
	const view = code("src/services/appApprovalView.ts");
	assert.ok(
		view.indexOf("if (!i.serverMatches)") <
			view.indexOf("if (!i.authenticated)"),
		"the server before the sign-in",
	);
	assert.ok(
		view.indexOf("if (!i.authenticated)") <
			view.indexOf("switch (i.identity.kind)"),
		"and the sign-in before the account check",
	);
	// the controller's check sits between reading the session and the mint, with nothing in between
	// that yields: no code is asked for on a server the check did not just see
	const approval = code("src/services/appApproval.ts");
	const check = approval.indexOf("if (!ports.serverMatches(request))");
	assert.ok(check > 0);
	assert.ok(approval.indexOf("ports.readToken()") < check);
	const mint = approval.indexOf("const result = await ports.createAuthCode(");
	assert.ok(check < mint);
	assert.doesNotMatch(
		approval.slice(check, mint),
		/\bawait\b/,
		"no yield between the check and the mint (the call itself runs before its await)",
	);
	assert.doesNotMatch(approval, /usesDefaultServer/);
});

test("Switch: the session goes before the server, the server is written in one place, and the app's host is never made into an address by the page", () => {
	const page = flat(code("src/pages/LoginApp.tsx"));
	const handler = page.slice(
		page.indexOf("const handleSwitchServer = "),
		page.indexOf("const model = deriveApprovalModel("),
	);
	assert.ok(handler.length > 200, "found the handler");
	// the order: guards, the choice, the stored session out, the page's copy out, the server written
	const steps = [
		"if (!event.isTrusted) return;",
		"request.api === undefined",
		"if (!serverArmed || !hasAttention()) return;",
		"if (!isFresh(request, Date.now())) {",
		"clearAppRequest(appRequestStorage());",
		'setDone("expired");',
		"serverChoiceFor(request.api, DEFAULT_API_BASE, window.location.origin)",
		"if (!forgetStoredSession()) return;",
		"setToken(null);",
		"localStorage.removeItem(CUSTOM_API_BASE_KEY)",
		"localStorage.setItem(CUSTOM_API_BASE_KEY, choice.base)",
		"setServerChanges((n) => n + 1);",
	];
	let at = -1;
	for (const step of steps) {
		const found = handler.indexOf(step, at + 1);
		assert.ok(found > at, `${step} comes in order`);
		at = found;
	}
	assert.doesNotMatch(handler, /logout\(/, "Switch is not logout");
	// "Use the default server" leaves a server as well: its session goes first, by the same function,
	// and the override only after the page's copy
	const useDefault = page.slice(
		page.indexOf("const handleUseDefaultServer = "),
		page.indexOf("const handleSwitchServer = "),
	);
	assert.ok(
		useDefault.includes(
			"if (settling || !forgetStoredSession()) return; setToken(null); try { localStorage.removeItem(CUSTOM_API_BASE_KEY); }",
		),
	);
	assert.equal(
		page.split("forgetStoredSession()").length - 1,
		3,
		"defined once, asked by the two ways off a server",
	);
	// the session is read back after it is removed, and a session that is still there stops Switch
	assert.ok(
		page.includes(
			'function forgetStoredSession() { try { localStorage.removeItem("byToken"); return localStorage.getItem("byToken") === null; } catch { return false; } }',
		),
	);
	// the page writes storage in exactly one place, and it is the server override in Switch
	assert.deepEqual(
		[...page.matchAll(/\.setItem\(([^;]*)\);/g)].map((m) => m[1]),
		["CUSTOM_API_BASE_KEY, choice.base"],
	);
	// the host a request names reaches the page's code in two places, and neither makes an address
	assert.deepEqual(
		[...page.matchAll(/request\.api\b[^;]*/g)].map((m) => m[0]),
		[
			"request.api === undefined || settling) return",
			"request.api, DEFAULT_API_BASE, window.location.origin)",
		],
	);
	assert.doesNotMatch(page, /https?:\/\//, "no address in the page");
	// the one place an address is made of it is a pure function, behind the parser's own grammar
	const contract = flat(code("src/services/appAuth.ts"));
	assert.deepEqual(
		[...contract.matchAll(/`https:\/\/[^`]*`/g)].map((m) => m[0]),
		["`https://${api}`"],
	);
	assert.ok(
		contract.includes(
			"export function apiBaseOfHost(api) { return isValidApiHost(api) ? `https://${api}` : null; }",
		),
	);
	// one grammar: the parser, the comparison and the base all ask isValidApiHost
	assert.equal(
		contract.split("isValidApiHost(").length - 1,
		4,
		"the definition, the parser, the comparison and the base",
	);
	assert.ok(
		contract.includes(
			'if (!isValidApiHost(apiText)) return refuse("api");',
		),
	);
	assert.ok(
		contract.includes(
			'if (typeof base !== "string" || !isValidApiHost(api)) return false;',
		),
	);
});

test("the card names the app's host as text and in no attribute, and the page does not render it", () => {
	const relative = "src/components/AppApprovalView.tsx";
	const file = ts.createSourceFile(
		relative,
		source(relative),
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	// every use of the host, by what it sits in: the test that picks the card, and then a child of an
	// element (a text node) four times: twice in the paragraph about switching, once in the one about
	// what is switched to, the last of them in the label of the Switch button
	const uses = [];
	const visit = (node) => {
		if (
			ts.isPropertyAccessExpression(node) &&
			node.getText(file) === "model.requestedHost"
		) {
			let place = node.parent;
			if (ts.isTemplateSpan(place)) place = place.parent.parent;
			uses.push([
				ts.SyntaxKind[place.kind],
				ts.SyntaxKind[place.parent.kind],
			]);
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	assert.deepEqual(uses, [
		["BinaryExpression", "ConditionalExpression"],
		["JsxExpression", "JsxElement"],
		["JsxExpression", "JsxElement"],
		["JsxExpression", "JsxElement"],
		["JsxExpression", "JsxElement"],
	]);
	assert.doesNotMatch(code("src/pages/LoginApp.tsx"), /requestedHost/);
});

test("Approve counts only while the card is in front of the person: visible tab, focused window, restarted on every change", () => {
	const page = code("src/pages/LoginApp.tsx");
	assert.match(
		page,
		/return document\.visibilityState === "visible" && document\.hasFocus\(\);/,
	);
	for (const [target, type] of [
		["window", "focus"],
		["window", "blur"],
		["document", "visibilitychange"],
	]) {
		assert.ok(
			page.includes(`${target}.addEventListener("${type}", update)`),
			`listens for ${type}`,
		);
		assert.ok(
			page.includes(`${target}.removeEventListener("${type}", update)`),
			`and stops listening for ${type}`,
		);
	}
	// the timer depends on the card (the account is part of the consent card's name) and on the
	// attention, and a click needs the attention too. Armed is the card it was earned on: a card that
	// takes the place of another is inert in its first render, and each button answers on its own card
	assert.match(page, /\[cardKey, attention\]/);
	assert.match(
		flat(page),
		/const cardKey = serverCardShown \? "server" : consentShown \? `consent:\$\{accountId\}` : null;/,
	);
	assert.match(
		page,
		/const armed = cardKey !== null && armedFor === cardKey;/,
	);
	assert.match(page, /const consentArmed = armed && !serverCardShown;/);
	assert.match(page, /const serverArmed = armed && serverCardShown;/);
	assert.match(
		page,
		/!consentArmed \|\| busy \|\| settling \|\| !hasAttention\(\)/,
		"Approve",
	);
	assert.equal(
		page.split("!serverArmed || !hasAttention()").length - 1,
		2,
		"Use the default server and Switch: armed, and the window in front of the person",
	);
	assert.match(
		flat(page),
		/serverCardShown = gate === "ok" && request !== null && !serverMatches && done === null;/,
	);
	assert.match(
		page,
		/const accountId = identity\.kind === "ready" \? identity\.networkId : null;/,
	);
});

test("the page navigates in four places only, each to a value built by the contract or to /", () => {
	const page = code("src/pages/LoginApp.tsx");
	const targets = [
		...page.matchAll(/location\.(assign|replace)\(([^)]*)\)/g),
	].map((m) => `${m[1]}(${m[2]})`);
	assert.deepEqual(targets.sort(), [
		"assign(openUrl)",
		"assign(outcome.url)",
		"assign(outcome.url)",
		'replace("/")',
	]);
	assert.equal(
		page.split("location.reload()").length - 1,
		2,
		"reload on a changed fragment and on request",
	);
	assert.doesNotMatch(
		page,
		/location\s*=[^=]|location\.href|history\.(push|replace)State|navigate\(/,
	);
	// the values come from the controller, whose addresses come from the two builders
	const approval = code("src/services/appApproval.ts");
	assert.equal(
		approval.split("url: buildApproveReturn(").length -
			1 +
			approval.split("= buildApproveReturn(").length -
			1,
		1,
	);
	assert.equal(
		approval.split("buildDenyReturn(").length - 1,
		1,
		"called once (and imported once)",
	);
	assert.doesNotMatch(approval, /url:\s*["'`]|url\s*=\s*["'`]/);
	// the dry run builds the address too (so a code is never minted for one that cannot be built)
	assert.equal(
		approval.split("buildApproveReturn(").length - 1,
		2,
		"the dry run and the real answer",
	);
	assert.ok(
		approval.includes(
			"buildApproveReturn(request, seal(DRY_RUN_CODE, request));",
		),
	);
	assert.ok(
		approval.includes('const DRY_RUN_CODE = "A".repeat(MAX_CODE_LENGTH);'),
	);
});

test("the code is minted only by the controller, with the named constants", () => {
	const approval = code("src/services/appApproval.ts");
	const calls = [...approval.matchAll(/createAuthCode\(([^)]*)\)/g)].map(
		(m) => m[1],
	);
	assert.deepEqual(calls, ["token, CODE_MINUTES, CODE_USES"]);
	// the page's one call of createAuthCode is the controller's port: it adds the time limit
	// and nothing else (the lifetimes are the controller's, not the page's)
	const file = ts.createSourceFile(
		"LoginApp.tsx",
		source("src/pages/LoginApp.tsx"),
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	const mintCalls = [];
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === "createAuthCode"
		) {
			let inPort = false;
			for (let p = node.parent; p; p = p.parent) {
				if (
					ts.isPropertyAssignment(p) &&
					p.name.getText(file) === "createAuthCode" &&
					ts.isObjectLiteralExpression(p.parent) &&
					ts.isCallExpression(p.parent.parent) &&
					p.parent.parent.expression.getText(file) ===
						"createApprovalController"
				) {
					inPort = true;
				}
			}
			mintCalls.push({
				args: node.arguments.map((a) => a.getText(file)),
				inPort,
			});
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	assert.deepEqual(mintCalls, [
		{ args: ["token", "minutes", "uses", "signal"], inPort: true },
	]);
	assert.doesNotMatch(
		approval,
		/\b(2|1)\s*\)/,
		"no numeric literal reaches the mint",
	);
	// the lifetimes are the contract's
	const contract = code("src/services/appAuth.ts");
	assert.match(contract, /export const CODE_MINUTES = 2;/);
	assert.match(contract, /export const CODE_USES = 1;/);
});

test("nothing logs the state, the key, the code or the answer; the one console line is fixed", () => {
	for (const file of NEW_FILES) {
		const text = code(file);
		const calls = [...text.matchAll(/console\.(\w+)\(([^)]*)\)/g)];
		if (file === "src/services/appAuth.ts") {
			assert.deepEqual(
				calls.map((m) => `${m[1]}(${m[2]})`),
				["warn(`[AppAuth] action=${action} platform=${platform}`)"],
			);
		} else {
			assert.deepEqual(calls, [], `${file} does not use the console`);
		}
	}
	assert.doesNotMatch(
		code("src/pages/LoginApp.tsx"),
		/JSON\.stringify|toast\./,
	);
});

test("web storage: the page writes the api server and nothing else, the stash writes only the validated request", () => {
	const page = code("src/pages/LoginApp.tsx");
	assert.doesNotMatch(
		page,
		/sessionStorage|document\.cookie|indexedDB|caches\./,
	);
	// the one write is Switch's server (the next test pins where); the session is only read and removed
	const used = [...page.matchAll(/localStorage\.(\w+)\(([^)]*)\)/g)]
		.map((m) => `${m[1]}(${m[2]})`)
		.sort();
	assert.deepEqual(used, [
		'getItem("byToken")',
		'removeItem("byToken")',
		'removeItem("byToken")',
		"removeItem(CUSTOM_API_BASE_KEY)",
		"removeItem(CUSTOM_API_BASE_KEY)",
		"setItem(CUSTOM_API_BASE_KEY, choice.base)",
	]);
	// the page reads the stored session through the helper that knows which server issued it, and
	// reads it in one place (the one getItem above is the read-back after Switch removed it)
	assert.equal(page.split("readSession(localStorage").length - 1, 1);
	// the stored session is removed only when it is the one the api turned away: the one read
	// of it is the page's own, guarded read, and the removal sits behind it
	assert.match(
		page,
		/if \(rejected !== null && readStoredToken\(\) === rejected\) \{\s*try \{\s*localStorage\.removeItem\("byToken"\);/,
	);

	const stash = code("src/services/appRequestStash.ts");
	assert.deepEqual(
		[...stash.matchAll(/\.setItem\(([^;]*)\);/g)].map((m) => m[1]),
		[
			"APP_REQUEST_KEY, JSON.stringify(slot)",
			"APP_SIGN_IN_KEY, String(Math.floor(nowMs))",
		],
		"the validated request, and the marker with the time",
	);
	assert.match(stash, /export const APP_REQUEST_KEY = "app_request";/);
	assert.match(stash, /export const APP_SIGN_IN_KEY = "app_sign_in";/);
	assert.doesNotMatch(stash, /localStorage|cookie|indexedDB/);
	assert.doesNotMatch(stash, /BroadcastChannel|postMessage|addEventListener/);
	for (const file of [
		"src/services/appAuth.ts",
		"src/services/appSeal.ts",
		"src/services/appApproval.ts",
		"src/services/appApprovalView.ts",
	]) {
		assert.doesNotMatch(
			code(file),
			/Storage|setItem|cookie|indexedDB/,
			file,
		);
	}
});

test("the contract builds answers from the table and the two forms only", () => {
	const contract = code("src/services/appAuth.ts");
	assert.match(contract, /\?state=\$\{urlValue\(request\.state\)\}/);
	assert.match(contract, /&error=access_denied/);
	assert.equal(contract.split("access_denied").length - 1, 1);
	for (const other of ["&code=", "?code=", "auth_code", "redirect"]) {
		assert.equal(contract.includes(other), false, other);
	}
	for (const file of NEW_FILES.filter(
		(f) => f !== "src/services/appAuth.ts",
	)) {
		assert.equal(
			code(file).includes("access_denied"),
			false,
			`${file} builds no address of its own`,
		);
		assert.equal(
			/urnetwork:\/\//.test(code(file)),
			false,
			`${file} holds no address`,
		);
	}
	assert.equal(
		code("src/services/appAuth.ts").split("urnetwork://auth").length - 1,
		1,
		"one return base, in the table",
	);
});

test("the sealing code is its own lazy chunk: tweetnacl is imported by appSeal.ts alone, and appSeal only dynamically", () => {
	const importers = [];
	const sealers = [];
	for (const file of allSources()) {
		const text = code(file);
		if (
			/from\s+["']tweetnacl["']|require\(["']tweetnacl["']\)|import\(["']tweetnacl["']\)/.test(
				text,
			)
		)
			importers.push(file);
		for (const match of text.matchAll(
			/(?:from\s+["'][^"']*appSeal(?:\.ts)?["']|import\(["'][^"']*appSeal(?:\.ts)?["']\))/g,
		)) {
			sealers.push(`${file}: ${match[0]}`);
		}
	}
	assert.deepEqual(importers, ["src/services/appSeal.ts"]);
	assert.deepEqual(
		sealers.sort(),
		['src/pages/LoginApp.tsx: import("../services/appSeal")'],
		"one dynamic import, shared by the prefetch and by Approve",
	);
	// appSeal takes from the contract module only (which stays in the main chunk): the
	// request types, as types, and the error type it throws for a key it cannot use
	assert.match(
		source("src/services/appSeal.ts"),
		/import \{\s*BadPublicKeyError,\s*type AppRequest,\s*type Sealed,?\s*\} from "\.\/appAuth\.ts";/,
	);
	assert.deepEqual(
		[
			...code("src/services/appSeal.ts").matchAll(
				/from\s+["']([^"']+)["']/g,
			),
		].map((m) => m[1]),
		["tweetnacl", "bs58", "./appAuth.ts"],
		"nothing else reaches the lazy chunk",
	);
	assert.equal(
		code("src/services/appSeal.ts").split(".fill(0)").length - 1,
		4,
		"ephemeral secret key, shared key, plaintext, the small-order probe",
	);
	assert.equal(code("src/main.tsx").includes("appSeal"), false);
});

test("main.tsx takes the request out of the address before React starts", () => {
	const main = source("src/main.tsx");
	const capture = main.indexOf(
		"captureAppRequest(window, appRequestStorage(), Date.now());",
	);
	assert.ok(capture > 0);
	assert.ok(capture < main.indexOf("createRoot("), "before React");
	assert.match(
		main,
		/try \{\n\s+captureAppRequest\(window, appRequestStorage\(\), Date\.now\(\)\);\n\} catch \{/,
	);
	assert.ok(
		main.includes("<StrictMode>"),
		"the rest of main.tsx is as it was",
	);
});

test("every storage access in the stash is guarded", () => {
	const relative = "src/services/appRequestStash.ts";
	const file = ts.createSourceFile(
		relative,
		source(relative),
		ts.ScriptTarget.ESNext,
		true,
	);
	let total = 0;
	const unguarded = [];
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			["getItem", "setItem", "removeItem"].includes(
				node.expression.name.text,
			)
		) {
			total++;
			let guarded = false;
			for (
				let child = node, parent = node.parent;
				parent;
				child = parent, parent = parent.parent
			) {
				if (ts.isTryStatement(parent) && parent.tryBlock === child) {
					guarded = true;
					break;
				}
				if (ts.isFunctionLike(parent)) break; // a try outside the function does not count
			}
			if (!guarded) unguarded.push(node.getText(file));
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	assert.equal(
		total,
		5,
		"the stash reads its slot and its marker, writes them, and removes keys in one place",
	);
	assert.deepEqual(
		unguarded,
		[],
		"each access sits in a try block of its own function",
	);
	assert.match(
		code(relative),
		/try \{\s*return window\.sessionStorage;\s*\}\s*catch/,
	);
});

test("tweetnacl and bs58 are pinned to exact versions in package.json and the lockfile", () => {
	const pkg = JSON.parse(source("package.json"));
	assert.equal(pkg.dependencies.tweetnacl, "1.0.3");
	assert.equal(pkg.dependencies.bs58, "6.0.0");
	for (const name of ["tweetnacl", "bs58"]) {
		assert.match(
			pkg.dependencies[name],
			/^\d+\.\d+\.\d+$/,
			`${name} has no range operator`,
		);
		assert.equal(pkg.devDependencies?.[name], undefined);
	}
	const lock = JSON.parse(source("package-lock.json"));
	assert.equal(lock.packages[""].dependencies.tweetnacl, "1.0.3");
	assert.equal(lock.packages[""].dependencies.bs58, "6.0.0");
	for (const [name, version] of [
		["tweetnacl", "1.0.3"],
		["bs58", "6.0.0"],
		["base-x", "5.0.1"],
	]) {
		const entry = lock.packages[`node_modules/${name}`];
		assert.equal(entry.version, version, name);
		assert.match(entry.integrity, /^sha512-/, name);
		assert.equal(
			entry.resolved,
			`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
			name,
		);
	}
	assert.deepEqual(lock.packages["node_modules/bs58"].dependencies, {
		"base-x": "^5.0.0",
	});
	assert.equal(
		lock.packages["node_modules/tweetnacl"].dependencies,
		undefined,
		"tweetnacl has no dependencies",
	);
	// the tests import TypeScript directly: the flag is needed on the Node the Makefile builds with
	assert.equal(
		pkg.scripts.test,
		"node --experimental-strip-types --test tests/*.test.mjs",
	);
	assert.match(source("Makefile"), /NODE_VERSION := v22\.14\.0/);
	// and the flag exists from Node 22.6: older Nodes stop on it, so the floor is said
	assert.deepEqual(pkg.engines, { node: ">=22.6" });
	assert.deepEqual(lock.packages[""].engines, { node: ">=22.6" });
	assert.match(source("README.md"), />=22\.6/);
});

test("the nginx template is as it was: this page has no block of its own", () => {
	// rendering the template could not be run for production, and a broken one takes the whole
	// manager down: the load balancer's frame header and the page's own gates protect the route
	const conf = source("nginx/nginx.conf.j2");
	assert.doesNotMatch(conf, /login-app/);
	assert.doesNotMatch(
		conf,
		/Content-Security-Policy|Cross-Origin-Opener-Policy|Referrer-Policy|no-store/i,
	);
	assert.equal(
		(conf.match(/^\s*location\s/gm) ?? []).length,
		3,
		"the status, catch-all and asset locations only",
	);
	assert.ok(conf.includes("add_header 'Cache-Control' 'no-cache';"));
	assert.ok(conf.includes("location ~ \\.(js|css)$ {"));
	assert.ok(conf.includes("location / {"));
});

test("the descriptor lists the contract versions and the platforms of the table, and nothing else", () => {
	const text = source("public/approval-contract.json");
	assert.equal(text, '{"contracts":[1,2],"platforms":["windows"]}\n');
	const descriptor = JSON.parse(text);
	assert.deepEqual(Object.keys(descriptor), ["contracts", "platforms"]);
	assert.deepEqual(descriptor.contracts, [...APP_CONTRACTS]);
	assert.deepEqual(descriptor.platforms, Object.keys(APP_PLATFORMS));
	assert.deepEqual(descriptor, { contracts: [1, 2], platforms: ["windows"] });
	// the versions it lists are the versions the parser reads, and no other
	assert.match(
		code("src/services/appAuth.ts"),
		/export const APP_CONTRACTS = Object\.freeze\(\[1, 2\]\);/,
	);
	// the retired readiness file is gone, and its name is nowhere (built from pieces, so this file does not spell it)
	const retired = ["app", "approval.json"].join("-");
	assert.equal(
		fs.existsSync(new URL(`public/${retired}`, managerRoot)),
		false,
	);
	assert.deepEqual(fs.readdirSync(new URL("public/", managerRoot)).sort(), [
		"_redirects",
		"approval-contract.json",
		"favicon.svg",
	]);
});

test("the extension's contract is untouched: its files do not know about /login-app", () => {
	const loginExtension = source("src/pages/LoginExtension.tsx");
	const extensionAuth = source("src/services/extensionAuth.ts");
	// what the published extensions depend on
	assert.ok(
		loginExtension.includes(
			"const response = await createAuthCode(token, 1, 1);",
		),
	);
	assert.ok(
		loginExtension.includes(
			"`${redirect_uri}#code=${encodeURIComponent(response.auth_code)}&state=${encodeURIComponent(state)}`",
		),
	);
	assert.ok(
		loginExtension.includes(
			"const EXTENSION_RETURN_KEY = 'extension_return_to';",
		),
	);
	assert.ok(
		extensionAuth.includes(
			"const CHROME_IDENTITY_HOST_SUFFIX = '.chromiumapp.org';",
		),
	);
	assert.ok(
		extensionAuth.includes(
			"host.endsWith('.mozilla.com') || host.endsWith('.allizom.org')",
		),
	);
	assert.ok(extensionAuth.includes("redirect_uri: z.string().url(),"));
	// and nothing in them points at the new flow
	for (const text of [
		loginExtension,
		extensionAuth,
		source("src/hooks/useAutoLogin.ts"),
		source("src/services/authCodeUrl.ts"),
		source("src/components/AuthSection.tsx"),
	]) {
		assert.doesNotMatch(
			text,
			/login-app|appAuth|appRequestStash|appApproval|app_request|urnetwork:\/\/auth/,
		);
	}
	// the new flow does not import the extension's modules either
	for (const file of NEW_FILES) {
		assert.doesNotMatch(
			code(file),
			/extensionAuth|LoginExtension|useAutoLogin/,
			file,
		);
	}
});

test("the app's own pieces are as small as they say: no new dependency beyond the two, no third-party script or font", () => {
	const imports = new Set();
	for (const file of NEW_FILES) {
		for (const match of code(file).matchAll(
			/(?:from\s+|import\()["']([^"']+)["']/g,
		)) {
			if (!match[1].startsWith(".")) imports.add(match[1]);
		}
	}
	assert.deepEqual([...imports].sort(), [
		"bs58",
		"lucide-react",
		"react",
		"tweetnacl",
	]);
	assert.doesNotMatch(source("index.html"), /<script[^>]+src="https?:/);
});

test("the files this change adds or edits mention no internal repository", () => {
	// built from pieces, so this file does not spell what it forbids
	const internal = new RegExp(
		`\\b${"m".repeat(3)}\\b|urnetwork/${"m".repeat(3)}|${["ur", "io/app"].join("\\.")}`,
		"i",
	);
	const files = [
		...NEW_FILES,
		"README.md",
		"src/main.tsx",
		"src/components/Layout.tsx",
		"src/services/api.ts",
		"src/context/AuthContext.tsx",
		"public/approval-contract.json",
		"package.json",
	];
	for (const file of files) {
		assert.doesNotMatch(source(file), internal, file);
	}
	for (const entry of fs.readdirSync(new URL("tests/", managerRoot), {
		recursive: true,
	})) {
		if (
			/(^|[\\/])app-[^\\/]*\.(mjs|json)$/.test(entry) ||
			entry.endsWith("app-request.mjs")
		) {
			assert.doesNotMatch(
				fs.readFileSync(new URL(`tests/${entry}`, managerRoot), "utf8"),
				internal,
				entry,
			);
		}
	}
});

test("README documents the contract and says the extension is a separate, frozen one", () => {
	const readme = source("README.md");
	assert.ok(readme.includes("## Approving a native app (`/login-app`)"));
	assert.match(
		readme,
		/`\/login-extension`[\s\S]{0,120}separate contract[\s\S]{0,160}frozen/,
	);
	for (const fact of [
		"#v=1&platform=windows&state=<S>&pk=<PK>&ts=<T>",
		"urnetwork://auth?state=<S>&epk=<b58>&n=<b58>&d=<b58>",
		"urnetwork://auth?state=<S>&error=access_denied",
		"duration_minutes: 2",
		"`uses: 1`",
		"240 s",
		"120 s",
		"RFC 4648 base32",
		"SHA-256",
		"XJ4BNP",
		"public/approval-contract.json",
		'{"contracts":[1,2],"platforms":["windows"]}',
		"tests/fixtures/app-auth-vector.json",
		// version 2: the request that names its network, its grammar, its card and its timeouts
		"### A request that names its network (version 2)",
		"#v=2&platform=windows&state=<S>&pk=<PK>&ts=<T>&api=<A>",
		"`isValidApiHost`",
		"`serverMatchesRequest(base, api, pageHref)`",
		"337 characters",
		'"Different API server"',
		'"Switch to {host}"',
		"Only continue if you set this server in URnetwork yourself.",
		"`setToken(null)`",
		"`API_TIMEOUT_MS`",
		"`SEAL_TIMEOUT_MS`",
		"tests/fixtures/app-request-vector-v2.json",
		"v=2&platform=windows&state=SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS&pk=WpSggvhoqoVW4XJvfjsB52dvVunYSQWrz6XiuMQVsCf&ts=1790000000&api=api.beta-test.net",
		"npm test",
		"Navigation Timing",
		"no approval control is interactive",
		"query string",
		"2,000 characters",
		"Reload this page and approve again",
		">=22.6",
		"third-party script",
		// what the page does that the contract's tables do not say, and where it follows them
		"### Where this page differs from the contract's tables",
		"Account changed",
		"No sign-in method",
		'generic "This sign-in link isn\'t valid" card as a damaged one',
		// the sealing chunk, a key it cannot use, the session another tab replaced, the dev run
		"racing the import against a timer",
		"A public key the page cannot seal to",
		"only if it is still the session the API turned away",
		"StrictMode",
		// the timings, as a table row each
		"| The two API calls | 30 s |",
		"| The sealing chunk at the click | 15 s |",
		"| Approve inert (and Switch, Use the default server) | about 800 ms once the tab is showing and the window has the focus |",
		// a session belongs to the server that issued it
		"### A session belongs to the server that issued it",
		"`byTokenServer`",
		"`src/services/sessionBinding.ts`",
		"`auth-session-binding.test.mjs`",
	]) {
		assert.ok(readme.includes(fact), `README mentions ${fact}`);
	}
	// facts that the README wraps across lines
	const flatReadme = readme.replace(/\s+/g, " ");
	for (const fact of [
		"Switch removes the stored session first",
		"are given up after 30 s through an abort signal (`API_TIMEOUT_MS`)",
		"The sealing chunk keeps its own, shorter 15 s (`SEAL_TIMEOUT_MS`",
		"A request that went stale while the card was shown is told so",
		"needs a trusted click, as Approve and Cancel do, on a card that has been in front of the person for about 800 ms",
		"The API server changed while you were signing in. Sign in again.",
		"The override stays set, for the whole browser, until somebody chooses Use Default",
		"the last label is neither all digits nor `0x` and hex digits",
		"calls its request back at once",
		"sends its copy of the session to a server it was not issued by",
	]) {
		assert.ok(flatReadme.includes(fact), `README says: ${fact}`);
	}
	// the claim that cannot be kept is not made: a session is never "never sent" by a page alone,
	// and whether a bad xn-- label is a name is the browser's call
	assert.doesNotMatch(flatReadme, /bad `xn--` label is no name\)/);
	assert.doesNotMatch(
		flatReadme,
		/a last label such as `0x10` reads as a number, a bad/,
	);
	// every test file the README names exists, and every app test file is named
	const named = new Set(readme.match(/app-[a-z-]+\.test\.mjs/g));
	for (const name of named) {
		assert.ok(fs.existsSync(new URL(`tests/${name}`, managerRoot)), name);
	}
	for (const entry of fs.readdirSync(new URL("tests/", managerRoot))) {
		if (/^app-.*\.test\.mjs$/.test(entry)) {
			assert.ok(named.has(entry), `README names ${entry}`);
		}
	}
});

// ----- what was left out on purpose stays out -----

/** every text file of the manager that is ours to read: sources, tests, public files, the top level */
function textFiles(dir = "", out = []) {
	for (const entry of fs.readdirSync(new URL(dir, managerRoot), {
		withFileTypes: true,
	})) {
		if (entry.isDirectory()) {
			if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
			textFiles(`${dir}${entry.name}/`, out);
		} else if (
			/\.(ts|tsx|js|mjs|cjs|json|md|html|css|go|j2|py|yml|yaml)$|^(Makefile|Dockerfile)$/.test(
				entry.name,
			)
		) {
			out.push(`${dir}${entry.name}`);
		}
	}
	return out;
}

test("no file mentions the retired readiness file", () => {
	const retired = ["app", "approval.json"].join("-");
	const files = textFiles();
	assert.ok(files.length > 50, `${files.length} files scanned`);
	for (const relative of files) {
		assert.equal(
			source(relative).includes(retired),
			false,
			`${relative} names the retired readiness file`,
		);
	}
});

test("the code to compare is not in the code, the tests or the page; the README keeps one reserved paragraph", () => {
	// the contract reserves it for a later version: nothing computes it, shows it or tests it today
	// (the names are built from pieces, so this file does not spell what it forbids)
	const pattern = new RegExp(["check", "[ _-]?code"].join(""), "i");
	const readme = "README.md";
	for (const relative of textFiles()) {
		if (relative === readme) continue;
		assert.doesNotMatch(source(relative), pattern, relative);
	}
	for (const name of [
		["check", "Code"].join(""),
		["CHECK", "CODE", "LENGTH"].join("_"),
		"BASE" + "32",
		"crypto.subtle",
	]) {
		for (const relative of NEW_FILES) {
			assert.equal(
				source(relative).includes(name),
				false,
				`${relative}: ${name}`,
			);
		}
	}
	// the README: one section, headed as reserved, with the formula and the vector
	const sections = source(readme).split(/\n(?=#{2,3} )/);
	const mentions = sections.filter((s) => pattern.test(s));
	assert.equal(
		mentions.length,
		1,
		"exactly one section of the README speaks of it",
	);
	const [section] = mentions;
	assert.match(section, /^### Reserved/);
	assert.match(section, /not displayed/i);
	assert.match(section, /RFC 4648/);
	assert.match(section, /SHA-256/);
	assert.match(section, /first 6/);
	assert.match(section, /XJ4BNP/);
	assert.match(section, /'abc'|"abc"|`abc`/);
	assert.equal(
		section.split("\n\n").length <= 4,
		true,
		"a paragraph, not a feature",
	);
});

test("no operating-system check remains: not in the table, not in the page, not in the cards", () => {
	for (const file of NEW_FILES) {
		assert.doesNotMatch(
			code(file),
			/userAgent|navigator\b|platformMatchesBrowser|wrong-os|osMatches|\bos:/,
			file,
		);
	}
	assert.deepEqual(Object.keys(APP_PLATFORMS.windows), [
		"label",
		"returnBase",
	]);
	assert.doesNotMatch(
		source("README.md"),
		/Browser OS|browser-OS|on your PC|PC where|userAgent/i,
	);
});

test("the two api calls the page makes are limited to 30 seconds, each with a signal of its own, and the sealing chunk to 15", () => {
	const page = code("src/pages/LoginApp.tsx");
	assert.match(page, /const API_TIMEOUT_MS = 30_000;/);
	assert.match(page, /const SEAL_TIMEOUT_MS = 15_000;/);
	assert.match(page, /fetchNetworkUser\(token, signal\)/);
	assert.match(page, /createAuthCode\(token, minutes, uses, signal\)/);
	assert.match(page, /new AbortController\(\)/);
	assert.match(
		page,
		/window\.setTimeout\(\(\) => abort\.abort\(\), API_TIMEOUT_MS\)/,
	);
	assert.match(page, /window\.clearTimeout\(timer\)/);
	// an import cannot be aborted, so the chunk's wait is raced against a limit of its own: the
	// load Approve waits on goes through the deadline, and the prefetch (which nothing waits on) does not
	assert.match(
		page,
		/loadSeal: async \(\) => \(await withDeadline\(importSeal\(\)\)\)\.sealCode/,
	);
	assert.match(page, /void importSeal\(\)\.catch\(\(\) => undefined\)/);
	assert.equal(
		page.split("API_TIMEOUT_MS").length - 1,
		2,
		"the constant and the abort timer: the api calls only",
	);
	assert.equal(
		page.split("SEAL_TIMEOUT_MS").length - 1,
		2,
		"the constant and the deadline's timer: the download only",
	);
	assert.match(
		page,
		/window\.setTimeout\(\(\) => reject\(new Error\("the download took too long"\)\), SEAL_TIMEOUT_MS\)/,
	);
	// the extension's calls are not given one
	const extension = source("src/pages/LoginExtension.tsx");
	assert.ok(extension.includes("await createAuthCode(token, 1, 1);"));
	assert.doesNotMatch(extension, /AbortController|signal/);
});

test("a leftover extension sign-in is removed under the key the extension itself uses", () => {
	const stash = source("src/services/appRequestStash.ts");
	assert.ok(
		stash.includes('const EXTENSION_RETURN_KEY = "extension_return_to";'),
	);
	for (const relative of [
		"src/components/Layout.tsx",
		"src/pages/LoginExtension.tsx",
	]) {
		assert.ok(
			source(relative).includes(
				"const EXTENSION_RETURN_KEY = 'extension_return_to';",
			),
			relative,
		);
	}
});

test("the freshness window is described the way the code runs: up to 240 s old, up to 120 s ahead", () => {
	const auth = source("src/services/appAuth.ts");
	assert.match(auth, /approvable up to 4 minutes after its `ts`/);
	assert.match(auth, /and from 2 minutes before it/);
	assert.doesNotMatch(auth, /approvable from 4 minutes after/);
	assert.match(auth, /export const REQUEST_MAX_AGE_S = 240;/);
	assert.match(auth, /export const REQUEST_MAX_AHEAD_S = 120;/);
});

test("the stash exports nothing that only the tests use", () => {
	for (const relative of allSources()) {
		assert.equal(
			source(relative).includes("lastCaptureResult"),
			false,
			`${relative} still has lastCaptureResult`,
		);
	}
});
