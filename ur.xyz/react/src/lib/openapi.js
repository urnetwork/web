/**
 * Normalize a parsed OpenAPI document into the shape the ApiExplorer
 * wants to render. We deliberately keep this lossy and opinionated:
 *
 *   - Operations are flattened from `paths.<path>.<method>` so each one
 *     can be rendered as a self-contained card with a stable id.
 *   - Operations are then bucketed into `groups` by their first path
 *     segment (`/auth/login` → "auth"). The sidebar uses these groups.
 *   - Schemas remain referenced by name; the renderer follows `$ref`s
 *     lazily so a recursive schema does not blow up at build time.
 */

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const GROUP_LABELS = {
    auth:         'Authentication',
    network:      'Network',
    stats:        'Stats',
    wallet:       'Wallet',
    subscription: 'Subscription',
    device:       'Device',
    account:      'Account',
    preferences:  'Preferences',
    feedback:     'Feedback',
    connect:      'Connect protocol',
    transfer:     'Transfer',
    solana:       'Solana',
    'referral-code': 'Referral codes',
    other:        'Other'
};

// Display order matches the natural reading order in the spec.
const GROUP_ORDER = [
    'auth',
    'network',
    'stats',
    'subscription',
    'wallet',
    'device',
    'account',
    'preferences',
    'feedback',
    'connect',
    'transfer',
    'solana',
    'referral-code',
    'other'
];

export function normalizeOpenApi(spec) {
    if (!spec || typeof spec !== 'object') {
        return { info: {}, operations: [], groups: [], schemas: {} };
    }

    const info = spec.info || {};
    const schemas = (spec.components && spec.components.schemas) || {};
    const operations = [];

    const paths = spec.paths || {};
    for (const pathKey of Object.keys(paths)) {
        const pathItem = paths[pathKey] || {};
        for (const method of HTTP_METHODS) {
            const op = pathItem[method];
            if (!op) continue;
            const id = slugifyOperation(method, pathKey);
            operations.push({
                id,
                method: method.toUpperCase(),
                path: pathKey,
                summary: op.summary || '',
                description: op.description || '',
                operationId: op.operationId || '',
                security: op.security,
                parameters: op.parameters || [],
                requestBody: op.requestBody || null,
                responses: op.responses || {}
            });
        }
    }

    // Bucket operations into groups by their first path segment.
    const byGroup = new Map();
    for (const op of operations) {
        const seg = (op.path.split('/')[1] || 'other').toLowerCase();
        const key = GROUP_LABELS[seg] ? seg : 'other';
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key).push(op);
    }

    const groups = GROUP_ORDER
        .filter(k => byGroup.has(k))
        .map(k => ({
            id: k,
            label: GROUP_LABELS[k],
            operations: byGroup.get(k)
        }));

    // Catch any groups not in GROUP_ORDER (e.g. /hello).
    for (const k of byGroup.keys()) {
        if (!GROUP_ORDER.includes(k)) {
            groups.push({
                id: k,
                label: GROUP_LABELS[k] || titleCase(k),
                operations: byGroup.get(k)
            });
        }
    }

    return { info, operations, groups, schemas };
}

function titleCase(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

/**
 * Build a stable, URL-friendly anchor for an operation. We include the
 * method so the same path under multiple verbs gets distinct ids.
 */
export function slugifyOperation(method, path) {
    const cleaned = path
        .replace(/[{}]/g, '')
        .replace(/^\//, '')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/gi, '');
    return `${method.toLowerCase()}-${cleaned}`.toLowerCase();
}

/**
 * Resolve a JSON-pointer-style $ref against the parsed spec. Only handles
 * the local "#/components/schemas/Foo" form OpenAPI uses.
 */
export function resolveRef(spec, ref) {
    if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let cur = spec;
    for (const p of parts) {
        if (cur == null) return null;
        cur = cur[p];
    }
    return cur || null;
}

/**
 * Walk an operation's request body / responses and return the schema
 * payload of the first JSON content type, or null. The OpenAPI spec
 * always nests schemas under content."application/json".schema.
 */
export function jsonSchemaOf(container) {
    if (!container || !container.content) return null;
    const json = container.content['application/json'];
    if (json && json.schema) return json.schema;
    // Fall back to whatever content type happens to be present.
    const first = Object.keys(container.content)[0];
    if (first && container.content[first]) {
        return container.content[first].schema || null;
    }
    return null;
}

/**
 * Does this operation require BearerAuth? Reads either the operation's
 * own `security` block or the global one when the operation does not
 * override it. An empty array (`security: []`) explicitly opts out.
 */
export function requiresAuth(op, spec) {
    let sec = op.security;
    if (sec === undefined) sec = spec && spec.security;
    if (!Array.isArray(sec)) return false;
    if (sec.length === 0) return false;
    return sec.some(entry => entry && Object.keys(entry).some(k => /bearer/i.test(k)));
}

/**
 * Build a representative JSON example for a schema.
 *
 * The OpenAPI document doesn't ship explicit `example` blocks, so we
 * synthesise one by walking the schema and choosing a plausible value
 * per property type — strings get a placeholder ("string"), numbers get
 * 0, enums get their first member, $refs are followed, and so on. The
 * result is suitable for the "sample input/output" panels next to each
 * operation card.
 *
 * `seen` tracks $ref names so a recursive schema collapses to a stub
 * instead of looping forever.
 */
export function exampleFor(schema, spec, seen = new Set()) {
    if (!schema || typeof schema !== 'object') return null;

    if (schema.$ref) {
        const name = schema.$ref.split('/').pop();
        if (seen.has(name)) return `<${name}>`;
        const target = resolveRef(spec, schema.$ref);
        if (!target) return `<${name}>`;
        const next = new Set(seen);
        next.add(name);
        return exampleFor(target, spec, next);
    }

    if (Array.isArray(schema.allOf)) {
        // Merge each branch into a single object.
        const merged = {};
        for (const sub of schema.allOf) {
            const part = exampleFor(sub, spec, seen);
            if (part && typeof part === 'object' && !Array.isArray(part)) {
                Object.assign(merged, part);
            }
        }
        return merged;
    }
    if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
        return exampleFor(schema.oneOf[0], spec, seen);
    }
    if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
        return exampleFor(schema.anyOf[0], spec, seen);
    }

    if (schema.example !== undefined) return schema.example;
    if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
    if (schema.const !== undefined) return schema.const;

    if (schema.type === 'array') {
        const item = exampleFor(schema.items || {}, spec, seen);
        return item === null ? [] : [item];
    }

    if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
        if (schema.properties) {
            const out = {};
            for (const key of Object.keys(schema.properties)) {
                out[key] = exampleFor(schema.properties[key], spec, seen);
            }
            return out;
        }
        if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
            return { '<key>': exampleFor(schema.additionalProperties, spec, seen) };
        }
        return {};
    }

    return scalarExample(schema);
}

function scalarExample(schema) {
    const type = schema.type;
    const fmt = schema.format;
    if (type === 'string') {
        if (fmt === 'date-time') return '2026-01-01T00:00:00Z';
        if (fmt === 'date')      return '2026-01-01';
        if (fmt === 'binary')    return '<binary>';
        const desc = (schema.description || '').toLowerCase();
        if (desc.includes('udid') || desc.includes('uuid')) return '00000000-0000-0000-0000-000000000000';
        if (desc.includes('email')) return 'user@example.com';
        if (desc.includes('phone')) return '+15555550100';
        if (desc.includes('jwt'))   return 'eyJhbGciOi…';
        return 'string';
    }
    if (type === 'integer') return 0;
    if (type === 'number')  return 0;
    if (type === 'boolean') return false;
    if (type === 'null')    return null;
    return null;
}

/**
 * Build the request and response examples for a single operation.
 *
 * Returns `{ request, responses }` where `responses` is an array of
 * `{ code, body }` entries (one per declared response). Either side can
 * be null when the operation does not declare a body for that side —
 * the renderer suppresses empty panels in that case.
 */
export function operationExamples(op, spec) {
    const reqSchema = op.requestBody ? jsonSchemaOf(op.requestBody) : null;
    const request = reqSchema ? exampleFor(reqSchema, spec) : null;

    const responses = [];
    for (const [code, body] of Object.entries(op.responses || {})) {
        const schema = jsonSchemaOf(body);
        responses.push({
            code,
            body: schema ? exampleFor(schema, spec) : null
        });
    }
    return { request, responses };
}
