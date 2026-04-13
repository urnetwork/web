import React, { useEffect } from 'react';
import openapiYaml from 'virtual:ur-openapi';
import Explorer from './Explorer';
import Nav from './Nav';
import Footer from './Footer';
import { Markdown } from '../lib/markdown.jsx';
import { parseYaml } from '../lib/yaml';
import {
    normalizeOpenApi,
    resolveRef,
    jsonSchemaOf,
    requiresAuth,
    operationExamples
} from '../lib/openapi';

const INITIAL_STATS = {
    totalFeesUr: 0,
    dataPB: 0,
    displayedNetworks: 250000,
    blockHeight: 0,
    totalSupply: 10000000,
    urDistributed: 0,
    urAbsorbed: 0,
    totalHeldUr: 0
};

/**
 * ApiExplorer
 *
 * Renders the /api page from the OpenAPI document at build/bringyour.yml.
 * The YAML is parsed once at module load, normalised into a flat list of
 * operations grouped by their first path segment, and then rendered as
 * cards inside the shared Explorer chrome.
 *
 * Each operation card is a two-column layout: docs and schema details on
 * the left, a sticky JSON sample (synthetic request + responses) on the
 * right. Request body and response sections are collapsed by default and
 * the visitor expands them with native <details>.
 *
 * The very top of the page hosts a "table of contents" that lists every
 * operation under its group, so a visitor can scan the full surface area
 * before drilling into any single endpoint.
 */

const SPEC = parseYaml(openapiYaml || '');
const NORMALISED = normalizeOpenApi(SPEC);

export default function ApiExplorer() {
    const { info, operations, groups, schemas } = NORMALISED;

    // Scroll to the requested operation on first mount if the URL has a
    // hash. The sidebar's `onPickApi` already handles in-page jumps.
    useEffect(() => {
        if (window.location.hash) {
            const id = window.location.hash.slice(1);
            const el = document.getElementById(id);
            if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
        }
    }, []);

    return (
        <div className="app">
            <Nav stats={INITIAL_STATS} />
            <Explorer kind="api" apiGroups={groups} apiOperations={operations}>
                <header className="explorer-page-header">
                    <span className="explorer-page-eyebrow">API reference</span>
                    <h1 className="explorer-page-title">{info.title || 'URnetwork'}</h1>
                    <p className="explorer-page-meta">
                        {info.version ? `Version ${info.version} · ` : ''}
                        {operations.length} operations across {groups.length} groups.
                    </p>
                </header>

                {info.description && (
                    <section className="api-intro">
                        <Markdown source={info.description} />
                    </section>
                )}

                <ApiToc groups={groups} />

                {groups.map(group => (
                    <section key={group.id} className="api-group">
                        <h2 className="md-h md-h2 api-group-title" id={`group-${group.id}`}>{group.label}</h2>
                        {group.operations.map(op => (
                            <Operation key={op.id} op={op} spec={SPEC} schemas={schemas} />
                        ))}
                    </section>
                ))}
            </Explorer>
            <Footer />
        </div>
    );
}

/**
 * Table of contents. Lists every operation in every group with a colour
 * coded method tag and the path. Tapping a row jumps to that operation
 * card lower on the page.
 */
function ApiToc({ groups }) {
    const handleJump = (e, id) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update the URL hash without pushing a history entry, so reload
        // and "copy link" both land on the right operation.
        if (history.replaceState) history.replaceState(null, '', `#${id}`);
    };

    return (
        <nav className="api-toc" aria-label="API operations table of contents">
            <div className="api-toc-header">
                <span className="api-toc-eyebrow">Operations</span>
                <span className="api-toc-meta">
                    {groups.reduce((n, g) => n + g.operations.length, 0)} endpoints
                </span>
            </div>
            <div className="api-toc-grid">
                {groups.map(group => (
                    <div key={group.id} className="api-toc-group">
                        <a
                            className="api-toc-group-label"
                            href={`#group-${group.id}`}
                            onClick={(e) => handleJump(e, `group-${group.id}`)}
                        >
                            {group.label}
                        </a>
                        <ul className="api-toc-list">
                            {group.operations.map(op => (
                                <li key={op.id}>
                                    <a
                                        href={`#${op.id}`}
                                        className="api-toc-link"
                                        onClick={(e) => handleJump(e, op.id)}
                                    >
                                        <span className={`api-toc-method method-${op.method.toLowerCase()}`}>
                                            {op.method}
                                        </span>
                                        <span className="api-toc-path">{op.path}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </nav>
    );
}

function Operation({ op, spec, schemas }) {
    const reqSchema = op.requestBody ? jsonSchemaOf(op.requestBody) : null;
    const auth = requiresAuth(op, spec);
    const responses = Object.entries(op.responses || {});
    const examples = operationExamples(op, spec);

    return (
        <article className="api-op" id={op.id}>
            <div className="api-op-grid">
                <div className="api-op-main">
                    <header className="api-op-header">
                        <span className={`api-op-method method-${op.method.toLowerCase()}`}>{op.method}</span>
                        <span className="api-op-path">{op.path}</span>
                        <span className={`api-op-auth ${auth ? '' : 'is-public'}`}>
                            {auth ? 'Bearer auth' : 'Public'}
                        </span>
                        {op.operationId && <span className="api-op-id">{op.operationId}</span>}
                    </header>

                    {op.description && (
                        <div className="api-op-desc">
                            <Markdown source={op.description} />
                        </div>
                    )}

                    {Array.isArray(op.parameters) && op.parameters.length > 0 && (
                        <section className="api-op-section">
                            <div className="api-op-section-label">Parameters</div>
                            <div className="api-schema">
                                {op.parameters.map((p, i) => (
                                    <Parameter key={i} param={p} spec={spec} schemas={schemas} />
                                ))}
                            </div>
                        </section>
                    )}

                    {reqSchema && (
                        <details className="api-op-details">
                            <summary className="api-op-details-summary">
                                <span className="api-op-section-label">Request body</span>
                                <span className="api-op-details-hint">show schema</span>
                            </summary>
                            <div className="api-op-details-body">
                                <SchemaTree schema={reqSchema} spec={spec} schemas={schemas} />
                            </div>
                        </details>
                    )}

                    {responses.length > 0 && (
                        <details className="api-op-details">
                            <summary className="api-op-details-summary">
                                <span className="api-op-section-label">Responses</span>
                                <span className="api-op-details-hint">
                                    {responses.length} {responses.length === 1 ? 'status' : 'statuses'} · show schema
                                </span>
                            </summary>
                            <div className="api-op-details-body">
                                {responses.map(([code, body]) => {
                                    const schema = jsonSchemaOf(body);
                                    return (
                                        <div key={code} className="api-op-response-block">
                                            <div className="api-field-type">{code}</div>
                                            {schema
                                                ? <SchemaTree schema={schema} spec={spec} schemas={schemas} />
                                                : <div className="api-schema-empty">No body</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    )}
                </div>

                <aside className="api-op-samples" aria-label="Sample payloads">
                    <ExamplePanels examples={examples} />
                </aside>
            </div>
        </article>
    );
}

/**
 * Right-rail JSON sample panels. Renders a "Request" block when the
 * operation has a body and a "Response" block per declared status code.
 * The panel sticks alongside the docs as the visitor scrolls so the
 * sample is always visible while reading the schema.
 */
function ExamplePanels({ examples }) {
    const hasRequest = examples.request !== null && examples.request !== undefined;
    const hasResponses = Array.isArray(examples.responses) && examples.responses.length > 0;

    if (!hasRequest && !hasResponses) {
        return (
            <div className="api-sample">
                <div className="api-sample-label">No body</div>
                <pre className="api-sample-pre"><code>{'// no payload'}</code></pre>
            </div>
        );
    }

    return (
        <>
            {hasRequest && (
                <div className="api-sample">
                    <div className="api-sample-header">
                        <span className="api-sample-label">Request</span>
                        <span className="api-sample-mime">application/json</span>
                    </div>
                    <pre className="api-sample-pre"><code>{formatJson(examples.request)}</code></pre>
                </div>
            )}
            {hasResponses && examples.responses.map(({ code, body }) => (
                <div key={code} className="api-sample">
                    <div className="api-sample-header">
                        <span className="api-sample-label">Response</span>
                        <span className={`api-sample-status status-${statusBucket(code)}`}>{code}</span>
                    </div>
                    {body === null || body === undefined
                        ? <pre className="api-sample-pre"><code>{'// no body'}</code></pre>
                        : <pre className="api-sample-pre"><code>{formatJson(body)}</code></pre>}
                </div>
            ))}
        </>
    );
}

function statusBucket(code) {
    const n = parseInt(code, 10);
    if (!Number.isFinite(n)) return 'other';
    if (n < 200) return 'info';
    if (n < 300) return 'ok';
    if (n < 400) return 'redirect';
    if (n < 500) return 'client';
    return 'server';
}

function formatJson(value) {
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        return String(value);
    }
}

function Parameter({ param, spec, schemas }) {
    const schema = param.schema || {};
    return (
        <div className="api-field">
            <div>
                <div className="api-field-name">
                    {param.name}
                    {param.in && (
                        <span className="api-field-in">({param.in})</span>
                    )}
                </div>
                <div className="api-field-type">{describeType(schema, spec)}</div>
            </div>
            <div className="api-field-desc">
                {param.description && <Markdown source={param.description} />}
                {param.required && (
                    <div className="api-field-enum">required</div>
                )}
            </div>
        </div>
    );
}

/**
 * Recursive schema renderer. Handles object/array/$ref/enum/oneOf/allOf
 * and falls through to a single-row "type" display for primitives. The
 * `depth` guard keeps recursive references (rare in this spec) bounded.
 */
function SchemaTree({ schema, spec, schemas, depth = 0 }) {
    if (!schema) return <div className="api-schema-empty">—</div>;

    if (schema.$ref) {
        const target = resolveRef(spec, schema.$ref);
        const name = schema.$ref.split('/').pop();
        if (depth > 6) {
            return <div className="api-field-type">{name} (recursive)</div>;
        }
        if (!target) {
            return <div className="api-field-type">{name}</div>;
        }
        return (
            <div>
                <div className="api-field-type">
                    <button
                        type="button"
                        className="api-ref-link"
                        onClick={() => {
                            const el = document.getElementById(`schema-${name}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        {name}
                    </button>
                </div>
                <SchemaTree schema={target} spec={spec} schemas={schemas} depth={depth + 1} />
            </div>
        );
    }

    if (Array.isArray(schema.allOf)) {
        return (
            <div>
                {schema.allOf.map((sub, i) => (
                    <SchemaTree key={i} schema={sub} spec={spec} schemas={schemas} depth={depth + 1} />
                ))}
            </div>
        );
    }
    if (Array.isArray(schema.oneOf)) {
        return (
            <div>
                <div className="api-field-type">one of</div>
                {schema.oneOf.map((sub, i) => (
                    <div key={i} className="api-field-nested">
                        <SchemaTree schema={sub} spec={spec} schemas={schemas} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }
    if (Array.isArray(schema.anyOf)) {
        return (
            <div>
                <div className="api-field-type">any of</div>
                {schema.anyOf.map((sub, i) => (
                    <div key={i} className="api-field-nested">
                        <SchemaTree schema={sub} spec={spec} schemas={schemas} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (schema.type === 'array') {
        return (
            <div>
                <div className="api-field-type">array</div>
                <div className="api-field-nested">
                    <SchemaTree schema={schema.items || {}} spec={spec} schemas={schemas} depth={depth + 1} />
                </div>
            </div>
        );
    }

    if (schema.type === 'object' || schema.properties) {
        const props = schema.properties || {};
        const keys = Object.keys(props);
        if (keys.length === 0) {
            // Object with no declared properties (often a free-form map).
            if (schema.additionalProperties) {
                return (
                    <div>
                        <div className="api-field-type">map</div>
                        {typeof schema.additionalProperties === 'object' && (
                            <div className="api-field-nested">
                                <SchemaTree
                                    schema={schema.additionalProperties}
                                    spec={spec}
                                    schemas={schemas}
                                    depth={depth + 1}
                                />
                            </div>
                        )}
                    </div>
                );
            }
            return <div className="api-schema-empty">empty object</div>;
        }
        return (
            <div className="api-schema">
                {keys.map(name => (
                    <Property
                        key={name}
                        name={name}
                        schema={props[name] || {}}
                        spec={spec}
                        schemas={schemas}
                        depth={depth + 1}
                    />
                ))}
            </div>
        );
    }

    // Scalar
    return (
        <div className="api-schema">
            <div className="api-field">
                <div>
                    <div className="api-field-type">{describeType(schema, spec)}</div>
                </div>
                <div className="api-field-desc">
                    {schema.description && <Markdown source={schema.description} />}
                    {Array.isArray(schema.enum) && (
                        <div className="api-field-enum">
                            enum: {schema.enum.join(', ')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Property({ name, schema, spec, schemas, depth }) {
    const isObject = schema && (schema.type === 'object' || schema.properties);
    const isArray = schema && schema.type === 'array';
    const isRef = schema && schema.$ref;
    const isUnion = schema && (schema.allOf || schema.oneOf || schema.anyOf);
    const expandable = isObject || isArray || isRef || isUnion;

    return (
        <div className="api-field">
            <div>
                <div className="api-field-name">{name}</div>
                <div className="api-field-type">{describeType(schema, spec)}</div>
            </div>
            <div className="api-field-desc">
                {schema && schema.description && <Markdown source={schema.description} />}
                {schema && Array.isArray(schema.enum) && (
                    <div className="api-field-enum">
                        enum: {schema.enum.join(', ')}
                    </div>
                )}
            </div>
            {expandable && (
                <div className="api-field-nested">
                    <SchemaTree schema={schema} spec={spec} schemas={schemas} depth={depth} />
                </div>
            )}
        </div>
    );
}

function describeType(schema, spec) {
    if (!schema) return '—';
    if (schema.$ref) return schema.$ref.split('/').pop();
    if (Array.isArray(schema.allOf)) return 'all of';
    if (Array.isArray(schema.oneOf)) return 'one of';
    if (Array.isArray(schema.anyOf)) return 'any of';
    if (schema.type === 'array') {
        const inner = schema.items ? describeType(schema.items, spec) : 'item';
        return `array<${inner}>`;
    }
    if (schema.type === 'object') {
        if (schema.additionalProperties) return 'map';
        return 'object';
    }
    if (schema.format) return `${schema.type || 'value'} (${schema.format})`;
    return schema.type || 'value';
}
