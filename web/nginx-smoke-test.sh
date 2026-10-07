#!/usr/bin/env bash

# Build-time HTTP smoke test for the host-based static-site routes. This runs
# inside the final image after the rendered nginx config and site files have
# been copied, so it catches behavior that `nginx -t` cannot (notably internal
# redirects between / and /index.html).
set -euo pipefail

test_dir=$(mktemp -d)
analytics_log="$test_dir/analytics.log"
nginx_error_log="$test_dir/nginx-error.log"

cleanup() {
    nginx -s quit >/dev/null 2>&1 || true
    rm -rf "$test_dir"
}
trap cleanup EXIT

fail() {
    printf 'nginx smoke test: %s\n' "$*" >&2
    exit 1
}

expect_response() {
    local host=$1
    local path=$2
    local expected_status=$3
    local expected_location=${4:-}
    local key=${host//./_}
    local headers="$test_dir/${key}.headers"
    local body="$test_dir/${key}.body"
    local status
    local location

    status=$(curl --silent --show-error \
        --output "$body" \
        --dump-header "$headers" \
        --write-out '%{http_code}' \
        --header "Host: $host" \
        "http://127.0.0.1${path}")

    if [[ "$status" != "$expected_status" ]]; then
        fail "$host$path returned $status, expected $expected_status"
    fi

    if [[ "$expected_status" == 200 && ! -s "$body" ]]; then
        fail "$host$path returned an empty successful response"
    fi

    if [[ -n "$expected_location" ]]; then
        location=$(awk 'BEGIN { IGNORECASE=1 } /^Location:/ { gsub(/\r/, "", $2); print $2; exit }' "$headers")
        if [[ "$location" != "$expected_location" ]]; then
            fail "$host$path redirected to ${location:-<missing>}, expected $expected_location"
        fi
    fi
}

# The first value of a response header in a dumped header file, the name
# matched case-insensitively.
header_value() {
    local headers=$1
    local name=$2

    awk -v name="$name" '
        BEGIN { name = tolower(name) }
        index($0, ":") > 1 && tolower(substr($0, 1, index($0, ":") - 1)) == name {
            value = substr($0, index($0, ":") + 1)
            sub(/^[[:space:]]+/, "", value)
            sub(/\r$/, "", value)
            print value
            exit
        }' "$headers"
}

# The response to host+path carries the header with exactly this value. An
# empty expected value means the response must not carry the header. Further
# arguments go to curl.
expect_header() {
    local host=$1
    local path=$2
    local name=$3
    local expected=$4
    shift 4
    local headers="$test_dir/header.headers"
    local value

    curl --silent --show-error \
        --output /dev/null \
        --dump-header "$headers" \
        --header "Host: $host" \
        "$@" \
        "http://127.0.0.1${path}"

    value=$(header_value "$headers" "$name")
    if [[ "$value" != "$expected" ]]; then
        fail "$host$path sent $name: ${value:-<none>}, expected ${expected:-<none>}"
    fi
}

expect_ip_json() {
    local label=$1
    local expected_ip=$2
    shift 2

    local headers="$test_dir/ip-${label}.headers"
    local body="$test_dir/ip-${label}.body"
    local status
    local content_type
    local cache_control
    local expected_body="{\"ip\":\"${expected_ip}\"}"

    status=$(curl --silent --show-error \
        --output "$body" \
        --dump-header "$headers" \
        --write-out '%{http_code}' \
        --header 'Host: ur.io' \
        --header 'Accept: application/json' \
        "$@" \
        'http://127.0.0.1/ip')

    [[ "$status" == 200 ]] || fail "ur.io/ip JSON ($label) returned $status, expected 200"
    [[ "$(<"$body")" == "$expected_body" ]] || \
        fail "ur.io/ip JSON ($label) returned $(<"$body"), expected $expected_body"

    content_type=$(header_value "$headers" Content-Type)
    [[ "$content_type" == 'application/json; charset=utf-8' ]] || \
        fail "ur.io/ip JSON ($label) content type was ${content_type:-<missing>}"

    cache_control=$(awk 'BEGIN { IGNORECASE=1 } /^Cache-Control:/ { sub(/^[^:]+:[[:space:]]*/, ""); gsub(/\r/, ""); print; exit }' "$headers")
    [[ "$cache_control" == no-store ]] || \
        fail "ur.io/ip JSON ($label) cache control was ${cache_control:-<missing>}"

    grep -Eiq '^Vary:.*(^|[,[:space:]])Accept([,[:space:]]|$)' "$headers" || \
        fail "ur.io/ip JSON ($label) did not vary on Accept"
}

expect_ip_html() {
    local label=$1
    local accept=$2
    local headers="$test_dir/ip-html-${label}.headers"
    local body="$test_dir/ip-html-${label}.body"
    local status
    local content_type

    status=$(curl --silent --show-error \
        --output "$body" \
        --dump-header "$headers" \
        --write-out '%{http_code}' \
        --header 'Host: ur.io' \
        --header "Accept: $accept" \
        'http://127.0.0.1/ip')

    [[ "$status" == 200 ]] || fail "ur.io/ip HTML ($label) returned $status, expected 200"
    [[ -s "$body" ]] || fail "ur.io/ip HTML ($label) returned an empty response"

    content_type=$(header_value "$headers" Content-Type)
    [[ "$content_type" == 'text/html; charset=utf-8' ]] || \
        fail "ur.io/ip HTML ($label) content type was ${content_type:-<missing>}"

    grep -Eiq '^Vary:.*(^|[,[:space:]])Accept([,[:space:]]|$)' "$headers" || \
        fail "ur.io/ip HTML ($label) did not vary on Accept"
}

# Miners and validators read the network operator list from ur.xyz. It must
# come from its own location: YAML, a five-minute lifetime rather than the
# hour that the generic machine-readable rule gives, and the list's schema line.
expect_operator_list() {
    local headers="$test_dir/operators.headers"
    local body="$test_dir/operators.body"
    local status
    local content_type
    local cache_control

    status=$(curl --silent --show-error \
        --output "$body" \
        --dump-header "$headers" \
        --write-out '%{http_code}' \
        --header 'Host: ur.xyz' \
        'http://127.0.0.1/operators.yml')

    [[ "$status" == 200 ]] || fail "ur.xyz/operators.yml returned $status, expected 200"

    content_type=$(awk 'BEGIN { IGNORECASE=1 } /^Content-Type:/ { sub(/^[^:]+:[[:space:]]*/, ""); sub(/[[:space:]]*;.*/, ""); gsub(/\r/, ""); print; exit }' "$headers")
    [[ "$content_type" == application/yaml ]] || \
        fail "ur.xyz/operators.yml content type was ${content_type:-<missing>}"

    cache_control=$(awk 'BEGIN { IGNORECASE=1 } /^Cache-Control:/ { sub(/^[^:]+:[[:space:]]*/, ""); gsub(/\r/, ""); print; exit }' "$headers")
    [[ "$cache_control" == 'public, max-age=300' ]] || \
        fail "ur.xyz/operators.yml cache control was ${cache_control:-<missing>}"

    grep -Eq '^schema: urnetwork-operators-v1([[:space:]]|$)' "$body" || \
        fail 'ur.xyz/operators.yml does not carry schema: urnetwork-operators-v1'
}

nginx -t
nginx >"$analytics_log" 2>"$nginx_error_log"

ready=false
for _ in $(seq 1 50); do
    if curl --silent --fail --header 'Host: status.invalid' \
        http://127.0.0.1/status >/dev/null; then
        ready=true
        break
    fi
    sleep 0.1
done
[[ "$ready" == true ]] || fail 'nginx did not become ready'
expect_response status.invalid /status 200

for host in ur.io preview.ur.io ur.xyz preview.ur.xyz; do
    expect_response "$host" / 200
    expect_response "$host" '/?smoke=1' 200
    expect_response "$host" /index.html 301 /
    expect_response "$host" '/index.html?smoke=1' 301 /
done

expect_response ur.io /products 200
expect_response ur.io /ip 200
expect_response ur.xyz /investors 200
expect_response ur.xyz /reserve 200
expect_operator_list
expect_response www.ur.io / 301 https://ur.io/
expect_response www.ur.xyz / 301 https://ur.xyz/

for host in bringyour.com www.bringyour.com ur.network www.ur.network; do
    expect_response "$host" / 301 https://ur.io/
    expect_response "$host" '/legacy/path?smoke=1' 301 'https://ur.io/legacy/path?smoke=1'
done

# CloudFront rewrites bringyour.com origin requests to main-web.bringyour.com.
# Legacy pages still redirect, while the images embedded by server email
# templates must remain byte-bearing 200 responses under both identities.
for host in main-web.bringyour.com main-web.ur.network; do
    expect_response "$host" / 301 https://ur.io/
    expect_response "$host" '/legacy/path?smoke=1' 301 'https://ur.io/legacy/path?smoke=1'
done
for host in bringyour.com main-web.bringyour.com; do
    for asset in \
        bringyour-wordmark-bg-240.jpg \
        ur-wordmark-bg-240.jpg \
        ur-welcome-header-1080.jpg \
        welcome-header-1080.jpg \
        urnetwork-goodbye-vpn.gif \
        urnetwork-spin.gif; do
        expect_response "$host" "/res/emails/$asset" 200
    done
    expect_response "$host" /res/emails/not-present.png 404
done

expect_response bringyour.com /status 200
expect_response main-web.bringyour.com /status 200
for host in www.bringyour.com ur.network www.ur.network; do
    expect_response "$host" /status 301 https://ur.io/status
done

# docs.ur.io, the retired GitBook docs site, sends each page with a successor
# there in one hop, from its .md and trailing-slash variants too. Every target
# must be a page of this build, so renaming a document fails the image instead
# of sending its old links to a 404.
expect_docs_page_redirect() {
    local path=$1
    local target=$2
    local target_page=${target%%#*}
    local variant

    for variant in "$path" "$path/" "$path.md"; do
        expect_response docs.ur.io "$variant" 301 "$target"
    done
    expect_response ur.io "${target_page#https://ur.io}" 200
}

expect_docs_page_redirect /provider 'https://ur.io/docs/faq#sharing-your-connection'
expect_docs_page_redirect /support/delete 'https://ur.io/docs/faq#how-do-i-delete-my-account'
expect_docs_page_redirect /protocol/protocol-research https://ur.io/docs/overview
expect_docs_page_redirect /trust-and-safety/trust-and-safety \
    'https://ur.io/docs/overview#safe-to-share-the-ipsecurity-layer'
for doc in terms privacy vdp; do
    expect_docs_page_redirect "/legal/$doc" "https://ur.io/$doc"
done
for skill in skill skill2; do
    expect_docs_page_redirect "/mcp/$skill" https://ur.io/agents
done
expect_docs_page_redirect /api https://ur.io/docs/api
expect_docs_page_redirect /api/api-reference https://ur.io/docs/api
for group in auth network stats subscription wallet device account preferences \
    feedback connect transfer solana referral-code; do
    expect_docs_page_redirect "/api/api-reference/$group" "https://ur.io/docs/api/$group"
done
expect_response docs.ur.io /api/api-reference/auth/code-login 301 https://ur.io/docs/api/auth
expect_response docs.ur.io /api/api-reference/authx 301 https://ur.io/docs/api
expect_response docs.ur.io /api/api-reference/retired-section/operation 301 https://ur.io/docs/api
for file in robots.txt llms.txt llms-full.txt; do
    expect_response docs.ur.io "/$file" 301 "https://ur.io/$file"
    expect_response ur.io "/$file" 200
done

# The root, the pages without a successor, and every other path go to the docs
# index.
expect_response ur.io /docs 200
for path in / /economic-model/economic-model /trust-and-safety/warrant-canary \
    /changelog/2024-10-31-update-1/update-1 /cli /legal /no/such/page; do
    expect_response docs.ur.io "$path" 301 https://ur.io/docs
done

# The query string carries over, ahead of a fragment: a GitBook search link
# (?q=) opens the same search on ur.io/docs.
expect_response docs.ur.io '/?q=wallet' 301 'https://ur.io/docs?q=wallet'
expect_response docs.ur.io '/no/such/page?smoke=1' 301 'https://ur.io/docs?smoke=1'
expect_response docs.ur.io '/provider?fallback=true' 301 \
    'https://ur.io/docs/faq?fallback=true#sharing-your-connection'
expect_response docs.ur.io '/legal/privacy?smoke=1' 301 'https://ur.io/privacy?smoke=1'
expect_response docs.ur.io '/api/api-reference/auth/code-login?smoke=1' 301 \
    'https://ur.io/docs/api/auth?smoke=1'

# The earlier Framer site's pages, in every language, which search engines
# still list, go to their successors in one hop, and every successor is a
# page of this build.
expect_successor() {
    local host=$1
    local path=$2
    local target=$3

    expect_response "$host" "$path" 301 "$target"
    expect_response "$host" "$target" 200
}

# Each country of the Framer map has its location page, so dropping a country
# from the site fails the image instead of sending its old page to a 404.
framer_countries=0
while read -r slug path; do
    framer_countries=$((framer_countries + 1))
    expect_successor ur.io "/how-to-get-a-vpn/vpn-access-in-$slug" "/location$path"
done < <(awk '
    /map \$framer_country \$framer_country_path/ { in_map = 1; next }
    in_map && /^[[:space:]]*}/ { exit }
    in_map && $1 != "default" { sub(/;$/, "", $2); print $1, $2 }' /etc/nginx/nginx.conf)
[[ "$framer_countries" -gt 0 ]] || fail 'nginx.conf has no $framer_country map'

for lang in '' /es /de /zh /ru /ar; do
    expect_successor ur.io "$lang/how-to-get-a-vpn/vpn-access-in-canada" "$lang/location/ca"
    expect_successor ur.io "$lang/how-to-get-a-vpn/vpn-access-in-united-states/" "$lang/location/us"
    # a Framer country without a location page, and the index
    expect_successor ur.io "$lang/how-to-get-a-vpn/vpn-access-in-northern-mariana-islands" "$lang/location"
    expect_successor ur.io "$lang/how-to-get-a-vpn" "$lang/location"
    for page in newsletter newsletter/issue-12 podcast podcast/episode-3; do
        expect_successor ur.io "$lang/$page" "$lang/blog"
    done
    for page in better-vpn privacy-and-security/; do
        expect_successor ur.io "$lang/$page" "$lang/products"
    done
    expect_successor ur.io "$lang/seeker" "$lang/install"
    expect_response ur.io "$lang/earn" 301 https://ur.xyz/
done
# the form search engines list for a name outside ASCII
expect_successor ur.io /how-to-get-a-vpn/vpn-access-in-r%C3%A9union /location/re

# The legacy bringyour.com blog has no page-by-page successor: its links land
# on the ur.io blog.
for host in bringyour.com main-web.bringyour.com; do
    for path in /blog /blog/ /blog/visual/ '/blog/visual/vis/latencymap/?smoke=1'; do
        expect_response "$host" "$path" 301 https://ur.io/blog
    done
done
expect_response ur.io /blog 200

# The paths where crawlers and agents guess ur.io's feed, sitemap and agents
# file lead to the real ones.
for path in /feed /feed/ /rss.xml; do
    expect_successor ur.io "$path" /blog/rss.xml
done
expect_successor ur.io /sitemap.xml /sitemap-index.xml
expect_successor ur.io /AGENTS.md /agents.md

# The markdown twins of ur.io's pages point search engines at the page they
# mirror. The site publishes /install.md from mmm's generate-agents-md.mjs;
# until the build has it, say so instead of failing the image.
for page in products about agents changelog install; do
    if [[ "$page" == install && ! -f /www/preview.ur.io/install.md ]]; then
        printf 'nginx smoke test: skipped ur.io/install.md, not in this build\n'
        continue
    fi
    expect_response ur.io "/$page.md" 200
    expect_header ur.io "/$page.md" Link "<https://ur.io/$page>; rel=\"canonical\""
done

# ur.xyz's retired sections, in every language, go to their successors in one
# hop, from their .html and trailing-slash forms too. The provider and
# extender roles keep the language: the miner page has localized copies.
for lang in '' /ru /ar /zh /de /es; do
    for path in providers extenders; do
        expect_successor ur.xyz "$lang/$path" "$lang/miners"
    done
    expect_successor ur.xyz "$lang/community" /about
    expect_successor ur.xyz "$lang/api" /docs
    expect_successor ur.xyz "$lang/roadmap" /investors
    expect_successor ur.xyz "$lang/whitepaper" /docs/litepaper
done
for variant in / .html; do
    expect_response ur.xyz "/de/providers$variant" 301 /de/miners
    expect_response ur.xyz "/extenders$variant" 301 /miners
    expect_response ur.xyz "/community$variant" 301 /about
    expect_response ur.xyz "/es/api$variant" 301 /docs
    expect_response ur.xyz "/roadmap$variant" 301 /investors
    expect_response ur.xyz "/zh/whitepaper$variant" 301 /docs/litepaper
done
expect_successor ur.xyz /sitemap.xml /sitemap-index.xml

# A localized docs URL goes to the English document in one hop, from its
# trailing-slash and .html forms too.
for lang in ru ar zh de es; do
    for variant in '' / .html; do
        expect_response ur.xyz "/$lang/docs$variant" 301 /docs
        expect_response ur.xyz "/$lang/docs/miner$variant" 301 /docs/miner
    done
done
expect_response ur.xyz /docs 200
expect_response ur.xyz /docs/miner 200

# Each investor PDF is a printout of an investor page: it stays a month-long
# download and points search engines at the page it prints.
while read -r pdf page; do
    expect_response ur.xyz "/investors/$pdf.pdf" 200
    expect_response ur.xyz "/investors/$page" 200
    expect_header ur.xyz "/investors/$pdf.pdf" Link "<https://ur.xyz/investors/$page>; rel=\"canonical\""
    expect_header ur.xyz "/investors/$pdf.pdf" Cache-Control 'public, max-age=2592000, stale-while-revalidate=86400'
done <<'EOF'
ur-investor-deck deck
our-letter-to-bittensor our-letter-to-bittensor
ur-conviction-lock-announcement conviction-lock
ur-letter-to-tokenholders-september-2026 letter-to-tokenholders-september-2026
ur-network-capacity-letter funding-network-capacity
EOF

# A page revalidates: a client that sends back the Last-Modified or the ETag
# it got, or both, gets a 304. nginx's 304 check compares its own validators
# (the file's mtime and size), so the response must carry those; Cloudflare
# may weaken the ETag, and the weak form must match too.
expect_revalidation() {
    local host=$1
    local path=$2
    local headers="$test_dir/revalidation.headers"
    local last_modified
    local etag
    local condition
    local status

    curl --silent --show-error \
        --output /dev/null \
        --dump-header "$headers" \
        --header "Host: $host" \
        "http://127.0.0.1${path}"
    last_modified=$(header_value "$headers" Last-Modified)
    etag=$(header_value "$headers" ETag)
    if [[ -z "$last_modified" || -z "$etag" ]]; then
        fail "$host$path sent Last-Modified: ${last_modified:-<none>}, ETag: ${etag:-<none>}"
    fi

    for condition in \
        "If-Modified-Since: $last_modified" \
        "If-None-Match: $etag" \
        "If-None-Match: W/${etag#W/}"; do
        status=$(curl --silent --show-error \
            --output /dev/null \
            --write-out '%{http_code}' \
            --header "Host: $host" \
            --header "$condition" \
            "http://127.0.0.1${path}")
        [[ "$status" == 304 ]] || fail "$host$path answered $condition with $status, expected 304"
    done

    status=$(curl --silent --show-error \
        --output /dev/null \
        --write-out '%{http_code}' \
        --header "Host: $host" \
        --header "If-Modified-Since: $last_modified" \
        --header "If-None-Match: $etag" \
        "http://127.0.0.1${path}")
    [[ "$status" == 304 ]] || fail "$host$path answered both validators with $status, expected 304"
}

for host in ur.xyz preview.ur.xyz; do
    for path in / /investors /docs/miner; do
        expect_revalidation "$host" "$path"
    done
done
for host in ur.io preview.ur.io; do
    for path in / /products /ip /docs/faq; do
        expect_revalidation "$host" "$path"
    done
done

# llms.txt and llms-full.txt are not copies of the home page, so they carry no
# canonical Link to it, and they cache like the other machine-readable files.
for host in ur.io ur.xyz; do
    for file in llms.txt llms-full.txt; do
        expect_response "$host" "/$file" 200
        expect_header "$host" "/$file" Link ''
        expect_header "$host" "/$file" Cache-Control 'public, max-age=3600, stale-while-revalidate=86400'
    done
done

# The public machine-readable files can be read from any origin. The load
# balancer answers the origin it allowlists (https://ur.io) itself, so for
# that one the response leaves the header off rather than send a second
# value. Pages are not machine-readable files.
expect_public_cors() {
    local host=$1
    local path=$2

    expect_response "$host" "$path" 200
    expect_header "$host" "$path" Access-Control-Allow-Origin '*'
    expect_header "$host" "$path" Access-Control-Allow-Origin '*' --header 'Origin: https://agent.example'
    expect_header "$host" "$path" Access-Control-Allow-Origin '' --header 'Origin: https://ur.io'
}

blog_md=$(find /www/preview.ur.io/blog-md -maxdepth 1 -name '*.md' -print -quit)
blog_md_localized=$(find /www/preview.ur.io/blog-md/es -maxdepth 1 -name '*.md' -print -quit)
[[ -n "$blog_md" && -n "$blog_md_localized" ]] || fail 'the ur.io build has no blog-md twins'
for path in /llms.txt /llms-full.txt /agents.md /products.md /openapi.yml /sitemap-index.xml \
    /blog/rss.xml /docs-md/index.md /docs-md/faq.md /docs-md/es/faq.md \
    "${blog_md#/www/preview.ur.io}" "${blog_md_localized#/www/preview.ur.io}"; do
    expect_public_cors ur.io "$path"
done
for path in /llms.txt /llms-full.txt /docs-md/miner.md /litepaper.md /operators.yml \
    /price.yml /price.rss /sitemap-index.xml; do
    expect_public_cors ur.xyz "$path"
done
expect_header ur.io /products Access-Control-Allow-Origin ''
expect_header ur.xyz /investors Access-Control-Allow-Origin ''

# The price feed caches like the other machine-readable files, not like a page.
expect_header ur.xyz /price.rss Cache-Control 'public, max-age=3600, stale-while-revalidate=86400'

# ur.xyz publishes markdown twins of its legal documents from
# scripts/generate-agent-assets.mjs; each points search engines at its page.
# Until the build has them, say so instead of failing the image.
for doc in terms privacy vdp; do
    if [[ ! -f "/www/preview.ur.xyz/$doc.md" ]]; then
        printf 'nginx smoke test: skipped ur.xyz/%s.md, not in this build\n' "$doc"
        continue
    fi
    expect_public_cors ur.xyz "/$doc.md"
    expect_header ur.xyz "/$doc.md" Link "<https://ur.xyz/$doc>; rel=\"canonical\""
done

# /ip remains HTML for browsers, but negotiates a tiny, non-cacheable JSON
# response for API clients. Cloudflare is authoritative on the public host;
# Warp's bracketed address is the direct/preview fallback.
expect_ip_html browser 'text/html,application/xhtml+xml,*/*;q=0.8'
expect_ip_html json-disabled 'application/json;q=0, text/html'
expect_ip_json cloudflare-v4 203.0.113.9 \
    --header 'CF-Ray: 0123456789abcdef-DFW' \
    --header 'CF-Connecting-IP: 203.0.113.9' \
    --header 'X-UR-Forwarded-For: 198.51.100.20:41001'
expect_ip_json warp-v6 2001:db8::7 \
    --header 'X-UR-Forwarded-For: [2001:db8::7]:41002'

# Text goes out as UTF-8 whatever its type, so no client falls back to
# ISO-8859-1. Apple's association file keeps the exact type Apple documents.
for host in ur.io ur.xyz; do
    expect_header "$host" / Content-Type 'text/html; charset=utf-8'
    expect_header "$host" /llms.txt Content-Type 'text/plain; charset=utf-8'
    expect_header "$host" /sitemap-index.xml Content-Type 'text/xml; charset=utf-8'
    expect_header "$host" /site.webmanifest Content-Type 'application/manifest+json; charset=utf-8'
done
expect_header ur.io /agents.md Content-Type 'text/markdown; charset=utf-8'
expect_header ur.io /openapi.yml Content-Type 'application/yaml; charset=utf-8'
expect_header ur.xyz /docs-md/miner.md Content-Type 'text/markdown; charset=utf-8'
expect_header ur.xyz /operators.yml Content-Type 'application/yaml; charset=utf-8'
expect_header ur.xyz /price.rss Content-Type 'application/rss+xml; charset=utf-8'
expect_header ur.io /.well-known/apple-app-site-association Content-Type application/json

# A synthetic edge request proves the only emitted page-view fields are the
# normalized path, country bucket, and classified source. Deliberately put
# secrets in every discarded surface so a regression is caught at image build.
curl --silent --show-error --fail \
    --output /dev/null \
    --header 'Host: ur.io' \
    --header 'CF-Ray: 0123456789abcdef-DFW' \
    --header 'CF-IPCountry: US' \
    --header 'Referer: https://www.google.com/search?q=must-not-leak' \
    --header 'Cookie: analytics-secret=must-not-leak' \
    --user-agent 'must-not-leak-user-agent' \
    'http://127.0.0.1/products?private=must-not-leak'

for _ in $(seq 1 50); do
    if grep -q '"path":"/products".*"region":"US".*"source":"search".*"engine":"google"' "$analytics_log"; then
        break
    fi
    sleep 0.1
done

grep -q '"event":"web_page_view"' "$analytics_log" || fail 'privacy-safe page-view event was not emitted'
grep -q '"path":"/products".*"region":"US".*"source":"search".*"engine":"google"' "$analytics_log" || \
    fail 'edge country or referrer classification was not emitted correctly'

for forbidden in must-not-leak 127.0.0.1 analytics-secret private= q= google.com/search; do
    if grep -Fq "$forbidden" "$analytics_log"; then
        fail "analytics log retained forbidden request data: $forbidden"
    fi
done

if grep -q '"site":"preview\.' "$analytics_log"; then
    fail 'preview traffic was emitted as a public page view'
fi

# A revalidated page view counts like a full one: a 304 for the page's file
# emits the event, while a 304 for a machine-readable file does not.
page_view_count() {
    grep -c "\"site\":\"$1\",\"path\":\"$2\"" "$analytics_log" || true
}

# Fetches host+path, then revalidates it with the Last-Modified it sent, and
# waits until the two requests have added the expected page views.
expect_counted_revalidation() {
    local host=$1
    local path=$2
    local expected=$3
    local headers="$test_dir/counted.headers"
    local before
    local status

    before=$(page_view_count "$host" "$path")
    curl --silent --show-error \
        --output /dev/null \
        --dump-header "$headers" \
        --header "Host: $host" \
        "http://127.0.0.1${path}"
    status=$(curl --silent --show-error \
        --output /dev/null \
        --write-out '%{http_code}' \
        --header "Host: $host" \
        --header "If-Modified-Since: $(header_value "$headers" Last-Modified)" \
        "http://127.0.0.1${path}")
    [[ "$status" == 304 ]] || fail "$host$path revalidated with $status, expected 304"

    for _ in $(seq 1 50); do
        [[ "$(page_view_count "$host" "$path")" -ge $((before + expected)) ]] && break
        sleep 0.1
    done
    [[ "$(page_view_count "$host" "$path")" == $((before + expected)) ]] || \
        fail "$host$path logged $(( $(page_view_count "$host" "$path") - before )) page views, expected $expected"
}

expect_counted_revalidation ur.xyz /llms.txt 0
expect_counted_revalidation ur.io /llms.txt 0
expect_counted_revalidation ur.xyz /reserve 2
expect_counted_revalidation ur.io /agents 2
# The page views above were logged after the llms.txt revalidations, which
# must still have logged none.
for host in ur.xyz ur.io; do
    [[ "$(page_view_count "$host" /llms.txt)" == 0 ]] || \
        fail "$host/llms.txt was logged as a page view"
done

printf 'nginx smoke test: canonical routes and privacy-safe analytics passed\n'
