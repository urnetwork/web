import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REACT_SRC = path.resolve(PROJECT_ROOT, 'react/src');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const OPENAPI_PATH = path.join(PROJECT_ROOT, 'build', 'bringyour.yml');

/** Walk a directory and return absolute paths of every file matching `ext`. */
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
 * Vite plugin that exposes the same virtual modules the React app uses:
 *   virtual:ur-docs    — the docs/ markdown corpus
 *   virtual:ur-openapi — the build/bringyour.yml OpenAPI document
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
        }
    };
}

const ENV = process.env.UR_ENV || 'main';
const envPath = path.join(__dirname, 'env', `${ENV}.json`);
const envConfig = fs.existsSync(envPath)
    ? JSON.parse(fs.readFileSync(envPath, 'utf8'))
    : {};

export default defineConfig({
    integrations: [react()],
    output: 'static',
    outDir: path.resolve(__dirname, 'build', ENV),
    vite: {
        plugins: [urXyzContent()],
        resolve: {
            alias: {
                '@react': REACT_SRC
            }
        },
        define: {
            '__UR_ENV__': JSON.stringify(envConfig)
        },
        // Allow imports from the react/ source tree
        server: {
            fs: { allow: [PROJECT_ROOT] }
        }
    }
});
