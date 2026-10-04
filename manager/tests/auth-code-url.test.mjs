// ?auth_code=<code>: ur.io's "Operator Client UI" opens the manager with a
// one-time sign-in code (POST /auth/code-create). The code always leaves the
// address bar first, even when it is not needed or does not work, and a code
// for another network than the signed-in one is never applied unasked.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import {
	AUTH_CODE_PARAM,
	authCodeAccountDecision,
	parseJwtClaims,
	takeAuthCode,
} from "../src/services/authCodeUrl.ts";
import * as authCodeUrl from "../src/services/authCodeUrl.ts";

const require = createRequire(import.meta.url);
const CODE = "AbC-dEf_123=";

function fakeJwt(claims) {
	const part = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${part({ alg: "ES256", typ: "JWT" })}.${part(claims)}.signature`;
}
const ALPHA = fakeJwt({ network_id: "network-alpha", network_name: "alpha" });
const ALPHA_OLDER = fakeJwt({ network_id: "network-alpha", network_name: "alpha", create_time: "older" });
const BETA = fakeJwt({ network_id: "network-beta", network_name: "beta" });

test("the code is taken out of the query and the rest is kept as written", () => {
	assert.equal(AUTH_CODE_PARAM, "auth_code");
	assert.deepEqual(takeAuthCode(`?auth_code=${CODE}`), { authCode: CODE, search: "" });
	assert.deepEqual(takeAuthCode(`?tab=clients&auth_code=${CODE}&x`), { authCode: CODE, search: "?tab=clients&x" });
	assert.deepEqual(takeAuthCode(`?auth_code=${encodeURIComponent(CODE)}`), { authCode: CODE, search: "" });
	// unusable codes are removed too
	assert.deepEqual(takeAuthCode("?auth_code=&a=1"), { authCode: null, search: "?a=1" });
	assert.deepEqual(takeAuthCode("?auth_code"), { authCode: null, search: "" });
	assert.deepEqual(takeAuthCode(`?auth%5Fcode=${CODE}&auth_code=other`), { authCode: CODE, search: "" });
	// nothing to remove
	assert.deepEqual(takeAuthCode(""), { authCode: null, search: null });
	assert.deepEqual(takeAuthCode("?tab=clients"), { authCode: null, search: null });
	assert.deepEqual(takeAuthCode(undefined), { authCode: null, search: null });
});

test("jwt claims are read without verifying, and junk reads as none", () => {
	assert.deepEqual(parseJwtClaims(ALPHA), { network_id: "network-alpha", network_name: "alpha" });
	const unicode = fakeJwt({ network_id: "n", network_name: "сеть-网络" });
	assert.equal(parseJwtClaims(unicode).network_name, "сеть-网络");
	assert.equal(parseJwtClaims("not-a-jwt"), null);
	assert.equal(parseJwtClaims("a.%%%.c"), null);
	assert.equal(parseJwtClaims(null), null);
});

test("a code for another network is never applied unasked", () => {
	const alpha = parseJwtClaims(ALPHA);
	const beta = parseJwtClaims(BETA);
	assert.equal(authCodeAccountDecision(null, alpha), "sign-in");
	assert.equal(authCodeAccountDecision(alpha, parseJwtClaims(ALPHA_OLDER)), "same-account");
	assert.equal(authCodeAccountDecision(beta, alpha), "ask-to-switch");
	assert.equal(authCodeAccountDecision(beta, null), "invalid");
	assert.equal(authCodeAccountDecision(null, {}), "invalid");
});

// ----- the real useAutoLogin hook, run with a minimal hooks runtime -----

const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountAutoLogin({ search, hash = "", token = null, codeLogin }) {
	const ts = require("typescript");
	const source = fs.readFileSync(new URL("../src/hooks/useAutoLogin.ts", import.meta.url), "utf8");
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
	});
	const events = [];
	const slots = [];
	let cursor = 0;
	let effects = [];
	const location = { pathname: "/", search, hash, state: null, key: "default" };
	const exchange = async (code) => {
		events.push({ exchange: code });
		return codeLogin(code);
	};
	const commit = (jwt, message) => events.push({ commit: jwt, message });
	const auth = {
		token,
		isAuthenticated: !!token,
		isLoading: false,
		setIsAutoLoginAttempted: (value) => events.push({ attempted: value }),
		exchangeAuthCode: exchange,
		commitToken: commit,
		// the previous hook's api: exchange, then commit on success
		login: async (code) => {
			const response = await exchange(code);
			if (response.error || !response.by_jwt) return null;
			commit(response.by_jwt, "Login successful");
			return response;
		},
	};
	const modules = {
		react: {
			useEffect(fn, deps) {
				const i = cursor++;
				if (slots[i] && deps && sameDeps(slots[i].deps, deps)) return;
				slots[i] = { deps };
				effects.push(fn);
			},
			useRef(initial) { const i = cursor++; return (slots[i] ??= { current: initial }); },
			useState(initial) {
				const i = cursor++;
				slots[i] ??= { value: initial };
				const slot = slots[i];
				return [slot.value, (v) => { slot.value = v; }];
			},
		},
		"react-router-dom": {
			useNavigate: () => navigate,
			useLocation: () => location,
			useSearchParams: () => [new URLSearchParams(location.search)],
		},
		"react-hot-toast": { __esModule: true, default: { error: (m) => events.push({ toastError: m }), success: (m) => events.push({ toastSuccess: m }) } },
		"./useAuth": { useAuth: () => auth },
		"../services/authCodeUrl": authCodeUrl,
	};
	function navigate(to, options) {
		events.push({ navigate: typeof to === "string" ? { pathname: to, search: "", hash: "" } : { pathname: to.pathname, search: to.search ?? "", hash: to.hash ?? "" }, replace: options?.replace === true });
		if (typeof to === "string") { location.pathname = to; location.search = ""; location.hash = ""; }
		else { location.pathname = to.pathname ?? location.pathname; location.search = to.search ?? ""; location.hash = to.hash ?? ""; }
	}
	const module = { exports: {} };
	new Function("require", "module", "exports", outputText)((name) => {
		if (!(name in modules)) throw new Error(`unexpected import ${name}`);
		return modules[name];
	}, module, module.exports);
	const render = () => {
		cursor = 0;
		const result = module.exports.useAutoLogin();
		const run = effects;
		effects = [];
		for (const effect of run) effect();
		return result;
	};
	return { render, events, location };
}

async function settled(mounted) {
	mounted.render();
	for (let i = 0; i < 3; i++) {
		await settle();
		mounted.render();
	}
	return mounted.render();
}

const kinds = (events) => events.map((e) => Object.keys(e)[0]).filter((k) => k !== "attempted");

test("a signed-out manager cleans the url, then signs in with the code", async () => {
	const mounted = mountAutoLogin({ search: `?tab=clients&auth_code=${CODE}`, hash: "#top", codeLogin: () => ({ by_jwt: ALPHA }) });
	const result = await settled(mounted);
	assert.deepEqual(kinds(mounted.events), ["navigate", "exchange", "commit"]);
	assert.deepEqual(mounted.events.find((e) => e.navigate), { navigate: { pathname: "/", search: "?tab=clients", hash: "#top" }, replace: true });
	assert.equal(mounted.events.find((e) => e.commit).commit, ALPHA);
	assert.equal(result.pendingSwitch, null);
});

test("a code that does not work is still removed from the url", async () => {
	const mounted = mountAutoLogin({ search: `?auth_code=${CODE}`, codeLogin: () => ({ error: { message: "Invalid auth code." } }) });
	await settled(mounted);
	assert.deepEqual(kinds(mounted.events), ["navigate", "exchange", "toastError"]);
	assert.equal(mounted.location.search, "");
	assert.match(mounted.events.find((e) => e.toastError).toastError, /sign-in link could not be used/);
});

test("a manager signed in to another network asks before switching", async () => {
	const mounted = mountAutoLogin({ search: `?auth_code=${CODE}`, token: BETA, codeLogin: () => ({ by_jwt: ALPHA }) });
	const result = await settled(mounted);
	assert.deepEqual(kinds(mounted.events), ["navigate", "exchange"]);
	assert.deepEqual({ ...result.pendingSwitch }, { currentNetwork: "beta", linkNetwork: "alpha" });
	assert.equal(JSON.stringify(result.pendingSwitch).includes(ALPHA), false, "the link's jwt is not exposed");

	result.cancelSwitch();
	assert.equal(mounted.render().pendingSwitch, null);
	assert.equal(mounted.events.some((e) => e.commit), false);
});

test("confirming the switch signs in to the link's network", async () => {
	const mounted = mountAutoLogin({ search: `?auth_code=${CODE}`, token: BETA, codeLogin: () => ({ by_jwt: ALPHA }) });
	const result = await settled(mounted);
	result.confirmSwitch();
	assert.equal(mounted.render().pendingSwitch, null);
	assert.equal(mounted.events.filter((e) => e.commit).length, 1);
	assert.equal(mounted.events.find((e) => e.commit).commit, ALPHA);
});

test("a code for the signed-in network changes nothing but the url", async () => {
	const mounted = mountAutoLogin({ search: `?auth_code=${CODE}`, token: ALPHA_OLDER, codeLogin: () => ({ by_jwt: ALPHA }) });
	const result = await settled(mounted);
	assert.deepEqual(kinds(mounted.events), ["navigate", "exchange"]);
	assert.equal(result.pendingSwitch, null);
});

test("a url without a code is left alone", async () => {
	const mounted = mountAutoLogin({ search: "?tab=clients", token: BETA, codeLogin: () => assert.fail("no exchange without a code") });
	await settled(mounted);
	assert.deepEqual(mounted.events, []);
});
