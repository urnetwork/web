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

for host in ur.xyz preview.ur.xyz; do
    expect_response "$host" / 200
    expect_response "$host" '/?smoke=1' 200
    expect_response "$host" /index.html 301 /
    expect_response "$host" '/index.html?smoke=1' 301 /
done

expect_response ur.xyz /investors 200
expect_response ur.xyz /reserve 200
expect_response ur.xyz /mainnet 200
expect_operator_list
expect_response www.ur.xyz / 301 https://ur.xyz/

# bringyour.com moved to the mmm service with the other mmm sites
# (mmm/mmm/PLAN.md), but its CloudFront distribution still reaches the origin
# as main-web.bringyour.com. Until that origin is switched to
# main-mmm.bringyour.com, web sends its requests there, so the images the
# server's emails link to keep loading. Remove these checks with the redirect,
# in the release after the switch.
for host in main-web.bringyour.com main-web.ur.network; do
    expect_response "$host" / 302 https://main-mmm.bringyour.com/
    expect_response "$host" '/legacy/path?smoke=1' 302 'https://main-mmm.bringyour.com/legacy/path?smoke=1'
    expect_response "$host" /res/emails/ur-wordmark-bg-240.jpg 302 \
        https://main-mmm.bringyour.com/res/emails/ur-wordmark-bg-240.jpg
    expect_response "$host" /status 200
done

# web serves none of the mmm sites now: their hosts reach only the default
# server, which has nothing but /status.
for host in ur.io preview.ur.io www.ur.io docs.ur.io bringyour.com www.bringyour.com \
    ur.network www.ur.network vpn.dev www.vpn.dev lag.dev www.lag.dev; do
    expect_response "$host" /products 404
done

# A retired path goes to its successor in one hop, and the successor is a page
# of this build.
expect_successor() {
    local host=$1
    local path=$2
    local target=$3

    expect_response "$host" "$path" 301 "$target"
    expect_response "$host" "$target" 200
}

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

# A directory of the build is no page: /audits, /team and /docs-md hold
# files, and /docs/support holds a page. nginx's static handler answers a
# directory with a 301 that adds a slash, which the trailing-slash rule took
# off again, so these looped. A directory with no page of its name is a 404
# and its slashed form one redirect to it; a page with a directory of the
# same name, as /investors has, still answers, as its checks show. `location /`
# serves no directory index page, and the build has none but the homepage,
# which `location = /` serves: astro writes every page as a file.
stray_index=$(cd /www/preview.ur.xyz && find . -mindepth 2 -name index.html -type f -print -quit)
[[ -z "$stray_index" ]] || fail "preview.ur.xyz has a directory index page, ${stray_index#.}, which nothing serves"
for host in ur.xyz preview.ur.xyz; do
    for path in /audits /team /docs-md /docs-md/support /docs/support /.well-known /_astro; do
        expect_response "$host" "$path" 404
    done
    for path in /audits /team /docs-md /docs/support; do
        expect_response "$host" "$path/" 301 "https://$host$path"
    done
    # a localized docs path goes to the English one
    expect_response "$host" /es/docs/support 301 /docs/support
done

# Every directory of the site, with its slash and without, ends within two
# redirects in a page, a file or an error, never a loop. Two: a localized
# path goes to the English one, which may then drop its slash. One curl run
# per round requests every path, HEAD only. _astro/ is left to the bundles'
# own location, which answers what it lacks itself.
expect_no_redirect_loops() {
    local host=$1
    local root=$2
    local round=0
    local config="$test_dir/loops.curl"
    local next

    (cd "$root" && find . -mindepth 1 -type d) | sed 's|^\.||' | awk '!/^\/_astro(\/|$)/' |
        LC_ALL=C sort > "$test_dir/dirs"
    if grep -qvE '^[A-Za-z0-9/._~-]+$' "$test_dir/dirs"; then
        fail "$root has a directory name this check cannot request: $(grep -vE '^[A-Za-z0-9/._~-]+$' "$test_dir/dirs" | head -n 1)"
    fi
    # each line: the path first asked for, then the path to ask now
    awk '{ print $0 " " $0; print $0 "/ " $0 "/" }' "$test_dir/dirs" > "$test_dir/loops.0"
    while [[ -s "$test_dir/loops.$round" ]]; do
        if [[ "$round" == 3 ]]; then
            fail "$host$(head -n 1 "$test_dir/loops.$round" | cut -d ' ' -f 1) still redirects after two redirects, to $(head -n 1 "$test_dir/loops.$round" | cut -d ' ' -f 2)"
        fi
        awk '{ printf "url = \"http://127.0.0.1%s\"\noutput = \"/dev/null\"\n", $2 }' \
            "$test_dir/loops.$round" > "$config"
        curl --silent --show-error --head --header "Host: $host" \
            --write-out '%{http_code} %header{location}\n' --config "$config" \
            > "$test_dir/loops.answers"
        [[ "$(wc -l < "$test_dir/loops.answers")" == "$(wc -l < "$test_dir/loops.$round")" ]] || \
            fail "curl answered $(wc -l < "$test_dir/loops.answers") of $(wc -l < "$test_dir/loops.$round") requests to $host"
        next=$((round + 1))
        # A redirect within the site is the next round's request; one to
        # another site ends the chain; a 5xx fails.
        paste -d ' ' "$test_dir/loops.$round" "$test_dir/loops.answers" | awk -v host="$host" '
            $3 >= 500 { print "error " $1 " " $3 > "/dev/stderr"; next }
            $3 >= 300 && $3 < 400 {
                location = $4
                sub(/\r$/, "", location)
                if (index(location, "https://" host "/") == 1) {
                    location = substr(location, length("https://" host) + 1)
                }
                if (location ~ /^\//) { print $1 " " location }
            }' > "$test_dir/loops.$next" 2> "$test_dir/loops.errors"
        if [[ -s "$test_dir/loops.errors" ]]; then
            fail "$host answered a directory with a server error: $(head -n 1 "$test_dir/loops.errors")"
        fi
        round=$next
    done
    printf 'nginx smoke test: %s: %d directories of %s end within two redirects\n' \
        "$host" "$(wc -l < "$test_dir/dirs")" "$root"
}

expect_no_redirect_loops ur.xyz /www/preview.ur.xyz

# A path with a backslash or a control character, raw or percent-encoded, is
# a real 404 before any redirect sees it, the localized docs and page
# redirects included. Echoed into a Location, a browser would read
# /\example.com, or /<tab>/example.com, as another site's address. nginx
# answers a NUL itself, with a 400.
for host in ur.xyz preview.ur.xyz; do
    for path in '/%5Cexample.com/' '/%5cexample.com/' '/\example.com/' '/%5Cevil.example.html' \
        '/%09/evil.example/' '/%0A/evil.example/' '/%0D/evil.example/' '/%1F/evil.example/' \
        '/%7F/evil.example/' '/ru/docs/%5Cevil.example' '/ru/docs/%09/evil.example' \
        '/ru/about/%5Cevil.example'; do
        expect_response "$host" "$path" 404
    done
    expect_response "$host" '/%00/evil.example/' 400

    # The .html and trailing-slash redirects name their host, so their
    # Location can't be read as another site's, and the query carries over.
    expect_response "$host" /investors/ 301 "https://$host/investors"
    expect_response "$host" /investors.html 301 "https://$host/investors"
    expect_response "$host" '/investors/?smoke=1' 301 "https://$host/investors?smoke=1"

    # index.html is the homepage's file, but its URL is /.
    expect_response "$host" /index 404
done
# www keeps the path percent-encoded on its way to the apex.
expect_response www.ur.xyz '/%5Cexample.com/' 301 'https://ur.xyz/%5Cexample.com/'

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

# llms.txt and llms-full.txt are not copies of the home page, so they carry no
# canonical Link to it, and they cache like the other machine-readable files.
for host in ur.xyz; do
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

for path in /llms.txt /llms-full.txt /docs-md/miner.md /litepaper.md /operators.yml \
    /price.yml /price.rss /sitemap-index.xml; do
    expect_public_cors ur.xyz "$path"
done
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

# Text goes out as UTF-8 whatever its type, so no client falls back to
# ISO-8859-1.
for host in ur.xyz; do
    expect_header "$host" / Content-Type 'text/html; charset=utf-8'
    expect_header "$host" /llms.txt Content-Type 'text/plain; charset=utf-8'
    expect_header "$host" /sitemap-index.xml Content-Type 'text/xml; charset=utf-8'
    expect_header "$host" /site.webmanifest Content-Type 'application/manifest+json; charset=utf-8'
done
expect_header ur.xyz /docs-md/miner.md Content-Type 'text/markdown; charset=utf-8'
expect_header ur.xyz /operators.yml Content-Type 'application/yaml; charset=utf-8'
expect_header ur.xyz /price.rss Content-Type 'application/rss+xml; charset=utf-8'

# A synthetic edge request proves the only emitted page-view fields are the
# normalized path, country bucket, and classified source. Deliberately put
# secrets in every discarded surface so a regression is caught at image build.
curl --silent --show-error --fail \
    --output /dev/null \
    --header 'Host: ur.xyz' \
    --header 'CF-Ray: 0123456789abcdef-DFW' \
    --header 'CF-IPCountry: US' \
    --header 'Referer: https://www.google.com/search?q=must-not-leak' \
    --header 'Cookie: analytics-secret=must-not-leak' \
    --user-agent 'must-not-leak-user-agent' \
    'http://127.0.0.1/reserve?private=must-not-leak'

for _ in $(seq 1 50); do
    if grep -q '"path":"/reserve".*"region":"US".*"source":"search".*"engine":"google"' "$analytics_log"; then
        break
    fi
    sleep 0.1
done

grep -q '"event":"web_page_view"' "$analytics_log" || fail 'privacy-safe page-view event was not emitted'
grep -q '"path":"/reserve".*"region":"US".*"source":"search".*"engine":"google"' "$analytics_log" || \
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
expect_counted_revalidation ur.xyz /reserve 2
# The page views above were logged after the llms.txt revalidations, which
# must still have logged none.
for host in ur.xyz; do
    [[ "$(page_view_count "$host" /llms.txt)" == 0 ]] || \
        fail "$host/llms.txt was logged as a page view"
done

# Content-hashed bundles across a staged rollout (carry-hashed-assets.sh). The
# load balancer picks a block for each request, so a page of one release may
# fetch its bundles from a block of the other. The image carries the bundles
# of the images deployed when it was built, listed apart from its own:
#   - every file under _astro/ is this build's own or carried, never both, so
#     nothing else accumulates;
#   - this build's pages name only its own bundles, so its list is its build;
#   - every carried bundle is served as an outgoing page asks for it:
#     immutable, and brotli-compressed when its .br sibling came along;
#   - a missing bundle is a 503 that no cache keeps, which the load balancer
#     retries on the service's other block.
expect_hashed_assets() {
    local host=$1
    local site=$2
    local root=/www/$site
    local own=/srv/hashed-assets/$site.own
    local carried=/srv/hashed-assets/$site.carried
    local headers="$test_dir/hashed.headers"
    local path
    local page
    local status
    local bundles=0

    [[ -f "$own" && -f "$carried" ]] || fail "the image does not list $site's hashed bundles"
    if ! diff <(cd "$root" && find _astro -type f | LC_ALL=C sort) \
        <(LC_ALL=C sort "$own" "$carried") >/dev/null; then
        fail "$site's _astro/ does not hold exactly its own and its carried bundles"
    fi
    if [[ -n "$(LC_ALL=C comm -12 <(LC_ALL=C sort "$own") <(LC_ALL=C sort "$carried"))" ]]; then
        fail "$site lists a bundle as both its own and carried"
    fi

    for page in "$root"/*.html; do
        grep -oE '/_astro/[A-Za-z0-9._-]+' "$page" || true
    done | sed 's|^/||' | LC_ALL=C sort -u | LC_ALL=C comm -23 - <(LC_ALL=C sort "$own") \
        > "$test_dir/unlisted"
    if [[ -s "$test_dir/unlisted" ]]; then
        fail "$site's pages name bundles that are not its own: $(head -n 3 "$test_dir/unlisted" | tr '\n' ' ')"
    fi

    while IFS= read -r path; do
        case "$path" in
            *.br | *.gz) continue ;;
        esac
        bundles=$((bundles + 1))
        status=$(curl --silent --show-error \
            --output /dev/null \
            --dump-header "$headers" \
            --write-out '%{http_code}' \
            --header "Host: $host" \
            --header 'Accept-Encoding: br, gzip' \
            "http://127.0.0.1/$path")
        [[ "$status" == 200 ]] || fail "$host/$path, a carried bundle, returned $status"
        [[ "$(header_value "$headers" Cache-Control)" == 'public, max-age=31536000, immutable' ]] || \
            fail "$host/$path, a carried bundle, is not immutable"
        if [[ -f "$root/$path.br" && "$(header_value "$headers" Content-Encoding)" != br ]]; then
            fail "$host/$path, a carried bundle, did not use its .br sibling"
        fi
    done < "$carried"
    printf 'nginx smoke test: %s carries %d bundles (%d files) beside its own %d files\n' \
        "$site" "$bundles" "$(wc -l < "$carried")" "$(wc -l < "$own")"

    expect_response "$host" /_astro/no-such-bundle.js 503
    expect_header "$host" /_astro/no-such-bundle.js Cache-Control no-store
}

expect_hashed_assets ur.xyz preview.ur.xyz

printf 'nginx smoke test: canonical routes and privacy-safe analytics passed\n'

# CloudFront normalizes the retired site's origin Host to main-web. A redirect
# to an internal mmm hostname is unusable in a browser; preserve path/query.
for legacy_origin in main-web.bringyour.com main-web.ur.network; do
    expect_response "$legacy_origin" '/' 301 'https://ur.io/'
    expect_response "$legacy_origin" '/download?source=legacy' 301 'https://ur.io/download?source=legacy'
    expect_response "$legacy_origin" '/blog/' 301 'https://ur.io/blog'
    expect_response "$legacy_origin" '/blog/visual/?source=legacy' 301 'https://ur.io/blog'
    expect_response "$legacy_origin" '/status' 200
done
