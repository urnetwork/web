// The api layer change /login-app needs: createAuthCode and fetchNetworkUser
// now say which HTTP status failed (so a 401 can mean "signed out") and take an
// optional abort signal (so a hung api can be given up), and nothing else about
// them or about any other call changes. The answer to createAuthCode is the
// credential itself, so it is read by a parser of its own whose failures say
// nothing about the body. src/services/api.ts is Vite code (import.meta.env),
// so it is compiled here and run against a fake fetch and a fake localStorage.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { inspect } from "node:util";

const require = createRequire(import.meta.url);

function loadApi({ responses, stored = {} }) {
	const ts = require("typescript");
	const raw = fs.readFileSync(
		new URL("../src/services/api.ts", import.meta.url),
		"utf8",
	);
	assert.ok(raw.includes("import.meta.env.VITE_API_BASE"));
	const source = raw.replace("import.meta.env.VITE_API_BASE", "undefined");
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	});
	const requests = [];
	const logged = [];
	const abortError = () =>
		Object.assign(new Error("The operation was aborted."), {
			name: "AbortError",
		});
	/** rejects when the request's signal aborts, as fetch does */
	const untilAborted = (init) =>
		new Promise((resolve, reject) => {
			if (!init.signal) return; // nothing can end it: it would hang for ever
			if (init.signal.aborted) reject(abortError());
			init.signal.addEventListener("abort", () => reject(abortError()));
		});
	const fakeFetch = async (url, init) => {
		requests.push({ url, init });
		const next = responses.shift();
		if (next instanceof Error) throw next;
		// `hang`: no answer at all, until the signal aborts the request
		if (next.hang) return untilAborted(init);
		const body =
			next.body === undefined
				? ""
				: typeof next.body === "string"
					? next.body
					: JSON.stringify(next.body);
		// `type: null` is an answer with no content-type header at all
		const type = "type" in next ? next.type : "application/json";
		return {
			ok: next.status >= 200 && next.status < 300,
			status: next.status,
			statusText: next.statusText ?? "",
			headers: {
				get: (name) =>
					name.toLowerCase() === "content-type" ? type : null,
			},
			// `readError`: the body cannot be read to the end
			// `hangRead`: the headers came, the body does not, until the signal aborts it
			text: async () => {
				if (next.readError) throw next.readError;
				if (next.hangRead) await untilAborted(init);
				return body;
			},
		};
	};
	const fakeStorage = {
		getItem: (key) => (key in stored ? stored[key] : null),
		setItem: (key, value) => {
			stored[key] = String(value);
		},
		removeItem: (key) => {
			delete stored[key];
		},
	};
	const fakeConsole = {
		log: (...a) => logged.push(a),
		warn: (...a) => logged.push(a),
		error: (...a) => logged.push(a),
		info: (...a) => logged.push(a),
	};
	const module = { exports: {} };
	new Function(
		"require",
		"module",
		"exports",
		"fetch",
		"localStorage",
		"console",
		outputText,
	)(
		(name) => {
			throw new Error(`unexpected import ${name}`);
		},
		module,
		module.exports,
		fakeFetch,
		fakeStorage,
		fakeConsole,
	);
	return { api: module.exports, requests, logged };
}

test("createAuthCode names the failed status and keeps its message", async () => {
	for (const status of [400, 401, 403, 429, 500, 503]) {
		const { api } = loadApi({
			responses: [{ status, body: "nope", type: "text/plain" }],
		});
		assert.deepEqual(
			await api.createAuthCode("token", 2, 1),
			{
				error: { message: `HTTP error! status: ${status}`, status },
			},
			String(status),
		);
	}
});

test("fetchNetworkUser names the failed status and keeps its message", async () => {
	for (const status of [401, 403, 404, 500]) {
		const { api } = loadApi({
			responses: [{ status, body: "nope", type: "text/plain" }],
		});
		assert.deepEqual(
			await api.fetchNetworkUser("token"),
			{
				error: { message: `HTTP error! status: ${status}`, status },
			},
			String(status),
		);
	}
});

test("a success is the parsed body, and a failure with no HTTP status has none", async () => {
	const ok = loadApi({
		responses: [
			{
				status: 200,
				body: { auth_code: "CODE", duration_minutes: 2, uses: 1 },
			},
		],
	});
	assert.deepEqual(await ok.api.createAuthCode("token", 2, 1), {
		auth_code: "CODE",
		duration_minutes: 2,
		uses: 1,
	});

	// the server answers a full quota with 200 and an error object: passed through as it came
	const limit = loadApi({
		responses: [
			{
				status: 200,
				body: {
					error: {
						auth_code_limit_exceeded: true,
						message: "Auth code limit exceeded.",
					},
				},
			},
		],
	});
	assert.deepEqual(await limit.api.createAuthCode("token", 2, 1), {
		error: {
			auth_code_limit_exceeded: true,
			message: "Auth code limit exceeded.",
		},
	});

	const down = loadApi({ responses: [new Error("Failed to fetch")] });
	assert.deepEqual(await down.api.createAuthCode("token", 2, 1), {
		error: { message: "Failed to fetch" },
	});
	const down2 = loadApi({ responses: [new Error("Failed to fetch")] });
	assert.deepEqual(await down2.api.fetchNetworkUser("token"), {
		error: { message: "Failed to fetch" },
	});

	const user = loadApi({
		responses: [
			{
				status: 200,
				body: {
					network_user: {
						network_name: "alpha",
						auth_types: ["email"],
					},
				},
			},
		],
	});
	assert.deepEqual(await user.api.fetchNetworkUser("token"), {
		network_user: { network_name: "alpha", auth_types: ["email"] },
	});
});

test("the request is the one it always was: bearer token, JSON body, the stored api server", async () => {
	const { api, requests } = loadApi({
		responses: [
			{ status: 200, body: { auth_code: "C" } },
			{ status: 200, body: {} },
		],
	});
	await api.createAuthCode("tok", 2, 1);
	assert.equal(requests[0].url, "https://api.bringyour.com/auth/code-create");
	assert.equal(requests[0].init.method, "POST");
	assert.equal(requests[0].init.headers.Authorization, "Bearer tok");
	assert.equal(
		requests[0].init.body,
		JSON.stringify({ duration_minutes: 2, uses: 1 }),
	);
	await api.fetchNetworkUser("tok");
	assert.equal(requests[1].url, "https://api.bringyour.com/network/user");
	assert.equal(requests[1].init.method, "GET");
	assert.equal(requests[1].init.headers.Authorization, "Bearer tok");

	const custom = loadApi({
		responses: [{ status: 200, body: { auth_code: "C" } }],
		stored: { urApiBase: "https://api.example.test" },
	});
	assert.equal(custom.api.getApiBase(), "https://api.example.test");
	assert.notEqual(custom.api.getApiBase(), custom.api.DEFAULT_API_BASE);
	await custom.api.createAuthCode("tok", 2, 1);
	assert.equal(
		custom.requests[0].url,
		"https://api.example.test/auth/code-create",
	);
	assert.equal(custom.api.DEFAULT_API_BASE, "https://api.bringyour.com");
});

test("every other call keeps its error object exactly as it was", async () => {
	const { api } = loadApi({
		responses: [{ status: 401, body: "no", type: "text/plain" }],
	});
	assert.deepEqual(
		await api.login("code"),
		{ error: { message: "HTTP error! status: 401" } },
		"code-login",
	);
	const other = loadApi({
		responses: [{ status: 401, body: "no", type: "text/plain" }],
	});
	const clients = await other.api.fetchClients("tok");
	assert.equal("status" in (clients.error ?? {}), false, "fetchClients");
	const payments = loadApi({
		responses: [{ status: 401, body: "no", type: "text/plain" }],
	});
	const result = await payments.api.fetchAccountPayments("tok");
	assert.equal(
		"status" in (result.error ?? {}),
		false,
		"fetchAccountPayments",
	);
});

// ----- the credential in the answer to createAuthCode -----

// shaped like the server's code: 683 url-safe characters and a padding "="
const SECRET = `${Buffer.from(
	Uint8Array.from(
		{ length: 512 },
		(_, i) => (i * 37 + (i >> 3) * 11 + 5) & 255,
	),
)
	.toString("base64url")
	.slice(0, 683)}=`;

/** what a console would show for these calls: an Error prints its message and stack */
const shown = (logged) =>
	inspect(logged, {
		depth: null,
		maxStringLength: null,
		maxArrayLength: null,
	});

/** true when any 8 consecutive characters of the code appear in the text, so a
 * piece of it counts however it got there: the start of a body, the text a
 * parser stopped at, the middle of a message */
const leaks = (text) => {
	for (let at = 0; at + 8 <= SECRET.length; at++) {
		if (text.includes(SECRET.slice(at, at + 8))) return true;
	}
	return false;
};

const NOT_JSON = "Expected JSON response but got a different content type";
const UNREADABLE = "Failed to parse response as JSON";

test("the leak check reads what a console shows, including the message inside an Error", () => {
	const hidden = [
		[
			"Create auth code error:",
			new Error(
				`Expected JSON response but got: ${SECRET.slice(100, 190)}`,
			),
		],
	];
	assert.equal(
		JSON.stringify(hidden).includes(SECRET.slice(100, 108)),
		false,
		"JSON.stringify cannot see inside an Error",
	);
	assert.equal(leaks(shown(hidden)), true);
	assert.equal(leaks(shown([["Login failed:", 401, "Unauthorized"]])), false);
	// the messages the api layer may give are not mistaken for the code
	assert.equal(
		leaks(
			`${NOT_JSON} ${UNREADABLE} HTTP error! status: 200 Create auth code error:`,
		),
		false,
	);
});

test("the code is never logged by the two calls", async () => {
	const { api, logged } = loadApi({
		responses: [{ status: 200, body: { auth_code: SECRET } }],
	});
	const response = await api.createAuthCode("tok", 2, 1);
	assert.equal(response.auth_code, SECRET);
	assert.equal(leaks(shown(logged)), false);
});

// An answer that is not JSON, or does not parse, is still the answer that holds
// the code: whatever the reader says about it is a message the page may show and
// a line the console keeps, so it says one of two fixed things.
const codeBody = JSON.stringify({
	auth_code: SECRET,
	duration_minutes: 2,
	uses: 1,
});
for (const [name, answer, message] of [
	["text/plain", { type: "text/plain", body: codeBody }, NOT_JSON],
	[
		"text/plain with another success status",
		{ status: 201, type: "text/plain", body: codeBody },
		NOT_JSON,
	],
	[
		"text/html",
		{
			type: "text/html; charset=utf-8",
			body: `<html><body>${codeBody}</body></html>`,
		},
		NOT_JSON,
	],
	["no content-type header", { type: null, body: codeBody }, NOT_JSON],
	[
		"JSON cut short",
		{ type: "application/json", body: codeBody.slice(0, 300) },
		UNREADABLE,
	],
	[
		"a body that is only the code",
		{ type: "application/json", body: SECRET },
		UNREADABLE,
	],
	[
		"the code where a value is expected",
		{ type: "application/json", body: `{"auth_code": ${SECRET}}` },
		UNREADABLE,
	],
	[
		"JSON followed by the code",
		{ type: "application/json", body: `${codeBody} ${SECRET}` },
		UNREADABLE,
	],
	[
		"a body that cannot be read to the end",
		{
			type: "application/json",
			body: codeBody,
			readError: new Error(`stream died near ${SECRET.slice(0, 40)}`),
		},
		UNREADABLE,
	],
]) {
	test(`createAuthCode: a 2xx answer that is ${name} reveals none of the code, in its message or in the console`, async () => {
		const { api, logged } = loadApi({
			responses: [{ status: 200, ...answer }],
		});
		const result = await api.createAuthCode("tok", 2, 1);
		assert.deepEqual(
			result,
			{ error: { message } },
			"one fixed message, no status and no code",
		);
		assert.equal(leaks(JSON.stringify(result)), false, "the result");
		assert.equal(leaks(shown(logged)), false, "the console");
	});
}

test("createAuthCode: an answer it can read is read as it always was", async () => {
	for (const [name, answer, expected] of [
		[
			"JSON with a charset",
			{
				type: "application/json; charset=utf-8",
				body: { auth_code: "CODE", duration_minutes: 2, uses: 1 },
			},
			{ auth_code: "CODE", duration_minutes: 2, uses: 1 },
		],
		["no content", { status: 204, type: null }, {}],
		["an empty body", { type: "application/json", body: "" }, {}],
		["a blank body", { type: "application/json", body: " \n\t " }, {}],
		[
			"the server's own error object",
			{
				type: "application/json",
				body: { error: { message: "No can do", status: 7 } },
			},
			{ error: { message: "No can do", status: 7 } },
		],
	]) {
		const { api } = loadApi({ responses: [{ status: 200, ...answer }] });
		assert.deepEqual(await api.createAuthCode("tok", 2, 1), expected, name);
	}
});

// ----- the optional abort signal -----

test("a signal is handed to fetch as it came, and a call without one has exactly the request it always had", async () => {
	const withSignal = new AbortController();
	const { api, requests } = loadApi({
		responses: [
			{ status: 200, body: { auth_code: "C" } },
			{ status: 200, body: {} },
			{ status: 200, body: { auth_code: "C" } },
			{ status: 200, body: {} },
		],
	});
	await api.createAuthCode("tok", 2, 1, withSignal.signal);
	await api.fetchNetworkUser("tok", withSignal.signal);
	assert.equal(requests[0].init.signal, withSignal.signal);
	assert.equal(requests[1].init.signal, withSignal.signal);
	assert.equal(requests[0].url, "https://api.bringyour.com/auth/code-create");
	assert.equal(requests[1].url, "https://api.bringyour.com/network/user");

	// the callers that never pass one (the extension, the dashboard): no signal key at all
	await api.createAuthCode("tok", 1, 1);
	await api.fetchNetworkUser("tok");
	assert.deepEqual(Object.keys(requests[2].init), [
		"method",
		"headers",
		"body",
	]);
	assert.deepEqual(Object.keys(requests[3].init), ["method", "headers"]);
	assert.equal("signal" in requests[2].init, false);
	assert.equal("signal" in requests[3].init, false);
	assert.equal(
		requests[2].init.body,
		JSON.stringify({ duration_minutes: 1, uses: 1 }),
	);
});

test("an aborted request is an error answer like any other failure, and carries nothing about the code", async () => {
	for (const call of [
		(api, signal) => api.createAuthCode("tok", 2, 1, signal),
		(api, signal) => api.fetchNetworkUser("tok", signal),
	]) {
		const abort = new AbortController();
		const { api, logged } = loadApi({
			responses: [{ status: 200, hang: true }],
		});
		const pending = call(api, abort.signal);
		abort.abort();
		const result = await pending;
		assert.deepEqual(result, {
			error: { message: "The operation was aborted." },
		});
		assert.equal(leaks(shown(logged)), false);
	}
	// already aborted before the call
	const abort = new AbortController();
	abort.abort();
	const { api } = loadApi({ responses: [{ status: 200, hang: true }] });
	assert.deepEqual(await api.fetchNetworkUser("tok", abort.signal), {
		error: { message: "The operation was aborted." },
	});
});

test("an abort while the mint's answer is being read is one of the two fixed messages, never a piece of the body", async () => {
	const abort = new AbortController();
	const { api, logged } = loadApi({
		responses: [
			{
				status: 200,
				type: "application/json",
				body: JSON.stringify({ auth_code: SECRET }),
				hangRead: true,
			},
		],
	});
	const pending = api.createAuthCode("tok", 2, 1, abort.signal);
	await new Promise((resolve) => setTimeout(resolve, 0));
	abort.abort();
	const result = await pending;
	assert.deepEqual(result, { error: { message: UNREADABLE } });
	assert.equal(leaks(JSON.stringify(result)), false);
	assert.equal(leaks(shown(logged)), false);
});
