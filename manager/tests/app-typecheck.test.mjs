// /login-app, the types of its files. The build is `vite build`, which does not
// type-check, and the project carries older type errors of its own, in other
// files, so nothing else would notice a renamed action or a wrong prop in the
// approval page. This runs the TypeScript compiler over the project's own
// tsconfig.app.json and fails on any diagnostic in the files the /login-app
// change adds, and in Layout.tsx where it is wired in. The older errors
// elsewhere are not this test's business.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const managerRoot = fileURLToPath(new URL("../", import.meta.url));

const CHECKED = [
	"src/services/appAuth.ts",
	"src/services/appSeal.ts",
	"src/services/appRequestStash.ts",
	"src/services/appApproval.ts",
	"src/services/appApprovalView.ts",
	"src/components/AppApprovalView.tsx",
	"src/pages/LoginApp.tsx",
	"src/components/Layout.tsx",
	// the auth context keeps a session with the server that issued it
	"src/services/sessionBinding.ts",
	"src/context/AuthContext.tsx",
];

/** TypeScript spells paths with forward slashes, whatever the platform */
const normal = (file) => path.resolve(file).replace(/\\/g, "/").toLowerCase();

test("the files of the /login-app change have no TypeScript diagnostics", () => {
	const configPath = path.join(managerRoot, "tsconfig.app.json");
	const read = ts.readConfigFile(configPath, ts.sys.readFile);
	assert.equal(read.error, undefined, "tsconfig.app.json can be read");
	const parsed = ts.parseJsonConfigFileContent(
		read.config,
		ts.sys,
		managerRoot,
	);
	assert.deepEqual(
		parsed.errors.map((e) =>
			ts.flattenDiagnosticMessageText(e.messageText, "\n"),
		),
		[],
		"tsconfig.app.json is valid",
	);

	const program = ts.createProgram({
		rootNames: parsed.fileNames,
		options: parsed.options,
	});
	const inProgram = new Set(
		program.getSourceFiles().map((f) => normal(f.fileName)),
	);
	const checked = new Set(
		CHECKED.map((file) => normal(path.join(managerRoot, file))),
	);
	for (const file of checked) {
		assert.ok(
			inProgram.has(file),
			`${file} is part of the program, so it is really checked`,
		);
	}

	const problems = ts
		.getPreEmitDiagnostics(program)
		.filter((d) => d.file && checked.has(normal(d.file.fileName)))
		.map((d) => {
			const { line, character } = ts.getLineAndCharacterOfPosition(
				d.file,
				d.start ?? 0,
			);
			const where = path
				.relative(managerRoot, d.file.fileName)
				.replace(/\\/g, "/");
			return `${where}(${line + 1},${character + 1}): TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
		});
	assert.deepEqual(problems, []);
});
