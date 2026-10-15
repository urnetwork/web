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

    location=$(header_value "$headers" Location)
    expect_location_on_site "$host$path" "$location"

    if [[ -n "$expected_location" ]]; then
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

# A browser reads a Location of //example.com, or /\example.com, as another
# site's address, and drops tabs and newlines before it looks. So no Location
# may start with //, nor carry a backslash or a control character at all.
# expect_response checks every response it gets.
expect_location_on_site() {
    local what=$1
    local location=$2

    case "$location" in
        //* | *[[:cntrl:]\\]*)
            fail "$what sent Location: $(printf '%q' "$location"), which starts with // or has a backslash or a control character" ;;
    esac
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

    content_type=$(awk 'BEGIN { IGNORECASE=1 } /^Content-Type:/ { gsub(/\r/, "", $2); print $2; exit }' "$headers")
    [[ "$content_type" == application/json ]] || \
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

    content_type=$(awk 'BEGIN { IGNORECASE=1 } /^Content-Type:/ { gsub(/\r/, "", $2); print $2; exit }' "$headers")
    [[ "$content_type" == text/html ]] || \
        fail "ur.io/ip HTML ($label) content type was ${content_type:-<missing>}"

    grep -Eiq '^Vary:.*(^|[,[:space:]])Accept([,[:space:]]|$)' "$headers" || \
        fail "ur.io/ip HTML ($label) did not vary on Accept"
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

# A path with a backslash or a control character, raw or percent-encoded, is
# a real 404 before any rule sees it, the prefix locations and the localized
# redirects included. Echoed into a Location, a browser would read
# /\example.com, or /<tab>/example.com, as another site's address. nginx
# answers a NUL itself, with a 400.
for host in ur.io preview.ur.io ur.xyz preview.ur.xyz; do
    for path in '/%5Cexample.com/' '/%5cexample.com/' '/\example.com/' '/%5Cevil.example.html' \
        '/%09/evil.example/' '/%0A/evil.example/' '/%0D/evil.example/' '/%1F/evil.example/' \
        '/%7F/evil.example/'; do
        expect_response "$host" "$path" 404
    done
    expect_response "$host" '/%00/evil.example/' 400
done
for host in ur.io preview.ur.io; do
    expect_response "$host" '/ru/docs/examples/%5Cevil.example' 404
    expect_response "$host" '/f/%5Cevil.example' 404
done
for host in ur.xyz preview.ur.xyz; do
    expect_response "$host" '/ru/docs/%5Cevil.example' 404
    expect_response "$host" '/ru/docs/%09/evil.example' 404
    expect_response "$host" '/ru/about/%5Cevil.example' 404
done

# The .html and trailing-slash redirects name their host, so their Location
# can't be read as another site's, and the query carries over.
for host in ur.io preview.ur.io; do
    expect_response "$host" /products/ 301 "https://$host/products"
    expect_response "$host" /products.html 301 "https://$host/products"
    expect_response "$host" '/products/?smoke=1' 301 "https://$host/products?smoke=1"
done
for host in ur.xyz preview.ur.xyz; do
    expect_response "$host" /investors/ 301 "https://$host/investors"
    expect_response "$host" /investors.html 301 "https://$host/investors"
    expect_response "$host" '/investors/?smoke=1' 301 "https://$host/investors?smoke=1"
done

# The redirect-only hosts keep the path percent-encoded, on an absolute URL.
for host in www.ur.io bringyour.com main-web.bringyour.com main-web.ur.network \
    www.bringyour.com ur.network www.ur.network; do
    expect_response "$host" '/%5Cexample.com/' 301 'https://ur.io/%5Cexample.com/'
done
expect_response www.ur.xyz '/%5Cexample.com/' 301 'https://ur.xyz/%5Cexample.com/'

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
