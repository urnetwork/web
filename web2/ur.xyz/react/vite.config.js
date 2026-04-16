import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const OPENAPI_PATH = path.join(PROJECT_ROOT, 'build', 'bringyour.yml');

/**
 * Walk a directory and return absolute paths of every file matching `ext`.
 * Hidden files / directories (".git", ".gitignore", …) are skipped.
 */
function walk(dir, ext) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p, ext));
        else if (e.name.endsWith(ext)) out.push(p);
    }
    return out;
}

/**
 * Custom Vite plugin that exposes the docs/ markdown corpus and the
 * build/bringyour.yml OpenAPI document as virtual modules:
 *
 *   import docs from 'virtual:ur-docs';
 *   import openapiYaml from 'virtual:ur-openapi';
 *
 * Both modules live outside the Vite root (the react/ directory), so a
 * regular `import.meta.glob` cannot reach them. Reading them at build time
 * keeps the runtime free of any filesystem access and lets the YAML stay
 * the single source of truth.
 */
function urXyzContent() {
    const DOCS_ID = 'virtual:ur-docs';
    const RESOLVED_DOCS_ID = '\0' + DOCS_ID;
    const API_ID = 'virtual:ur-openapi';
    const RESOLVED_API_ID = '\0' + API_ID;

    return {
        name: 'ur-xyz-content',
        resolveId(id) {
            if (id === DOCS_ID) return RESOLVED_DOCS_ID;
            if (id === API_ID) return RESOLVED_API_ID;
            return null;
        },
        load(id) {
            if (id === RESOLVED_DOCS_ID) {
                const files = walk(DOCS_DIR, '.md');
                const docs = files.map(abs => ({
                    path: path.relative(DOCS_DIR, abs).replace(/\\/g, '/'),
                    content: fs.readFileSync(abs, 'utf8')
                }));
                return `export default ${JSON.stringify(docs)};`;
            }
            if (id === RESOLVED_API_ID) {
                const yml = fs.existsSync(OPENAPI_PATH)
                    ? fs.readFileSync(OPENAPI_PATH, 'utf8')
                    : '';
                return `export default ${JSON.stringify(yml)};`;
            }
            return null;
        },
        // Re-emit the virtual modules when source files on disk change so
        // editing a doc or the OpenAPI spec hot-reloads in dev.
        configureServer(server) {
            const invalidate = (id) => {
                const mod = server.moduleGraph.getModuleById(id);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    server.ws.send({ type: 'full-reload' });
                }
            };
            server.watcher.add(DOCS_DIR);
            server.watcher.add(OPENAPI_PATH);
            server.watcher.on('all', (_event, file) => {
                if (file.startsWith(DOCS_DIR) && file.endsWith('.md')) {
                    invalidate(RESOLVED_DOCS_ID);
                }
                if (file === OPENAPI_PATH) {
                    invalidate(RESOLVED_API_ID);
                }
            });
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), urXyzContent()],
    server: {
        port: 5173,
        host: true,
        open: false,
        // The docs/ and build/ directories live above the Vite root, so we
        // widen fs.allow to the project root for completeness even though
        // the virtual-module plugin already mediates access.
        fs: {
            allow: [PROJECT_ROOT]
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
});
