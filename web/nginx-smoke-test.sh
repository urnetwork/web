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
expect_response ur.xyz /investors 200
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

printf 'nginx smoke test: canonical routes and privacy-safe analytics passed\n'
