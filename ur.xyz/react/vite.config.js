import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

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
 * Custom Vite plugin that exposes the docs/ markdown corpus as a virtual
 * module:
 *
 *   import docs from 'virtual:ur-docs';
 *
 * The corpus lives outside the Vite root (the react/ directory), so a
 * regular `import.meta.glob` cannot reach it. Reading it at build time
 * keeps the runtime free of any filesystem access.
 */
function urXyzContent() {
    const DOCS_ID = 'virtual:ur-docs';
    const RESOLVED_DOCS_ID = '\0' + DOCS_ID;

    return {
        name: 'ur-xyz-content',
        resolveId(id) {
            if (id === DOCS_ID) return RESOLVED_DOCS_ID;
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
            return null;
        },
        // Re-emit the virtual module when a document on disk changes so
        // editing a doc hot-reloads in dev.
        configureServer(server) {
            const invalidate = (id) => {
                const mod = server.moduleGraph.getModuleById(id);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    server.ws.send({ type: 'full-reload' });
                }
            };
            server.watcher.add(DOCS_DIR);
            server.watcher.on('all', (_event, file) => {
                if (file.startsWith(DOCS_DIR) && file.endsWith('.md')) {
                    invalidate(RESOLVED_DOCS_ID);
                }
            });
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        // the i18n module top-level-awaits the language dictionary (see
        // src/i18n/index.jsx); TLA needs es2022 output
        target: 'es2022',
        outDir: 'dist',
        sourcemap: true
    },
    plugins: [react(), urXyzContent()],
    server: {
        port: 5173,
        host: true,
        open: false,
        // The docs/ directory lives above the Vite root, so we widen
        // fs.allow to the project root for completeness even though the
        // virtual-module plugin already mediates access.
        fs: {
            allow: [PROJECT_ROOT]
        }
    }
});
