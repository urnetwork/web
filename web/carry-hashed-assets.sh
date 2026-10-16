#!/usr/bin/env bash

# The content-hashed bundles a site image carries across a staged rollout.
#
# The load balancer picks a block for each request, with no stickiness, and a
# rollout deploys the blocks in stages a minute or more apart. A page of one
# release then fetches its bundles (_astro/, named by content hash) from
# blocks of either release. So each image carries the bundles of the images
# deployed to the service's blocks when it is built: a page of the outgoing
# release finds its bundles on a new block, during the rollout and after it.
# A page of the new release that asks an old block for a new bundle gets a
# 503 (nginx/nginx.conf.j2), which the load balancer retries on the other
# block.
#
# An image carries only the deployed images' own bundles, never what they
# carried in turn, so it holds its own release and the releases deployed when
# it was built: one, or one per block when the blocks differ. Each image lists
# its own hashed files in /srv/hashed-assets/<site>.own and the carried ones
# in <site>.carried. Each build also publishes its own hashed files as a
# small companion image, <repository>:hashed-assets-<tag>, which the next
# build reads instead of the whole image (several GB). An image without a
# companion is read whole, filtered by its .own list; an image from before
# these lists carried nothing, so all of its hashed files are its own.
#
# Usage:
#   carry-hashed-assets.sh stage <build_dir> <site>...
#       On the build host. Lists the hashed files of each site's build,
#       <build_dir>/<site>, in <build_dir>/hashed-assets/<site>.own, and
#       stages in <build_dir>/carried-assets/<site>/ the own hashed files of
#       the CARRY_IMAGES images that this build lacks.
#   carry-hashed-assets.sh merge <carried_dir> <www_dir> <list_dir> <site>...
#       In the image build. Adds to <www_dir>/<site> each staged file that it
#       lacks, and lists the added files in <list_dir>/<site>.carried.
#   carry-hashed-assets.sh publish <image> <build_dir> <site>...
#       On the build host. Pushes the own hashed files of each site's build,
#       with their lists, as the companion image <image>.
#   carry-hashed-assets.sh export <image_root> <out_dir> <site>...
#       In the extraction build that stage runs for each carried image, whose
#       files are at <image_root>. Copies its own hashed files to
#       <out_dir>/<site>/.
#
# Environment:
#   CARRY_IMAGES     the images whose own hashed files to carry, separated by
#                    spaces: image references, or "deployed" for the images
#                    deployed to the blocks of WARP_SERVICE in WARP_ENV now
#                    (warpctl ls versions), WARP_DOCKER_NAMESPACE/
#                    WARP_DOCKER_IMAGE:<version>. Empty carries none.
#   CARRY_PLATFORMS  the platforms publish pushes, separated by commas.
set -euo pipefail

# The site directories whose files are named by their content hash.
hashed_dirs=(_astro)
# A hashed path is a hashed directory, then names made of these characters,
# none starting with a dot: nothing can climb out of a site, and nothing but
# a bundle travels between images.
safe_path='^_astro(/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$'
# warpctl ls versions: "[<service>][<block>] <version>", with no version for a
# block never deployed.
version_line='^\[([^]]+)\]\[([^]]+)\] +([^[:space:]]+)[[:space:]]*$'

work=
cleanup() {
    if [[ -n "$work" ]]; then
        rm -rf "$work"
    fi
}
trap cleanup EXIT

fail() {
    printf 'carry-hashed-assets: %s\n' "$*" >&2
    exit 1
}

note() {
    printf 'carry-hashed-assets: %s\n' "$*" >&2
}

# The hashed files of the site at $1, as paths relative to it, sorted.
hashed_files() {
    local site_dir=$1
    local dir

    (
        cd "$site_dir"
        for dir in "${hashed_dirs[@]}"; do
            if [[ -d "$dir" ]]; then
                find "$dir" -type f
            fi
        done
    ) | LC_ALL=C sort
}

# Fails unless every line of the list $1 is a hashed path.
check_list() {
    local list=$1
    local path

    while IFS= read -r path; do
        [[ "$path" =~ $safe_path ]] ||
            fail "$list names $(printf '%q' "$path"), which is not a hashed file"
    done < "$list"
}

# The images CARRY_IMAGES names, one per line.
carry_images() {
    local -a images

    read -r -a images <<< "${CARRY_IMAGES:-}"
    if [[ ${#images[@]} == 1 && "${images[0]}" == deployed ]]; then
        deployed_images
    elif [[ ${#images[@]} -gt 0 ]]; then
        printf '%s\n' "${images[@]}"
    fi
}

# The images deployed to the service's blocks, by the versions warpctl
# records for them. A docker tag spells a version's + as - (warpctl's
# convertVersionToDocker).
deployed_images() {
    local versions
    local line

    : "${WARP_ENV:?carrying the deployed images needs WARP_ENV}"
    : "${WARP_SERVICE:?carrying the deployed images needs WARP_SERVICE}"
    : "${WARP_DOCKER_NAMESPACE:?carrying the deployed images needs WARP_DOCKER_NAMESPACE}"
    : "${WARP_DOCKER_IMAGE:?carrying the deployed images needs WARP_DOCKER_IMAGE}"

    versions=$(warpctl ls versions "$WARP_ENV" "$WARP_SERVICE") ||
        fail "warpctl could not list the versions deployed to $WARP_ENV $WARP_SERVICE"
    while IFS= read -r line; do
        if [[ "$line" =~ $version_line && "${BASH_REMATCH[1]}" == "$WARP_SERVICE" ]]; then
            printf '%s/%s:%s\n' "$WARP_DOCKER_NAMESPACE" "$WARP_DOCKER_IMAGE" "${BASH_REMATCH[3]/+/-}"
        fi
    done <<< "$versions" | LC_ALL=C sort -u
}

# The image to read the own hashed files of the image $1 from: its companion
# when the registry has one, otherwise the image itself.
carry_source() {
    local image=$1
    local companion

    if [[ "$image" != *@* && "${image##*/}" == *:* ]]; then
        companion="${image%:*}:hashed-assets-${image##*:}"
        if docker buildx imagetools inspect "$companion" >/dev/null 2>&1; then
            printf '%s\n' "$companion"
            return
        fi
    fi
    printf '%s\n' "$image"
}

stage() {
    local build_dir=$1
    shift
    local lists="$build_dir/hashed-assets"
    local carried="$build_dir/carried-assets"
    local site
    local image
    local source
    local path
    local total
    local new
    local resolved
    local -a images

    rm -rf "$lists" "$carried"
    mkdir -p "$lists" "$carried"
    for site in "$@"; do
        [[ -d "$build_dir/$site" ]] || fail "$build_dir/$site is missing: build the sites first"
        hashed_files "$build_dir/$site" > "$lists/$site.own"
        check_list "$lists/$site.own"
        mkdir -p "$carried/$site"
    done

    # A command substitution, so that a failed lookup fails the build.
    resolved=$(carry_images)
    images=()
    while IFS= read -r image; do
        if [[ -n "$image" ]]; then
            images+=("$image")
        fi
    done <<< "$resolved"
    if [[ ${#images[@]} == 0 ]]; then
        note "carrying no image's hashed files: CARRY_IMAGES is empty, or no block is deployed"
        return
    fi

    work=$(mktemp -d)
    # The extraction build's context is this script, which it runs.
    mkdir -p "$work/context"
    cp "${BASH_SOURCE[0]}" "$work/context/carry-hashed-assets.sh"
    chmod 755 "$work/context/carry-hashed-assets.sh"

    for image in "${images[@]}"; do
        source=$(carry_source "$image")
        if [[ "$source" == "$image" ]]; then
            note "$image has no hashed-assets companion, so the whole image is read"
        fi
        rm -rf "$work/out"
        docker buildx build --progress plain \
            --build-arg "CARRY_IMAGE=$source" \
            --build-arg "CARRY_SITES=$*" \
            --output "type=local,dest=$work/out" \
            --file - "$work/context" <<'DOCKERFILE' ||
ARG CARRY_IMAGE
FROM ${CARRY_IMAGE} AS carry
FROM --platform=$BUILDPLATFORM ubuntu:24.04 AS export
ARG CARRY_SITES
COPY carry-hashed-assets.sh /usr/local/sbin/carry-hashed-assets
RUN --mount=type=bind,from=carry,target=/carry \
    /usr/local/sbin/carry-hashed-assets export /carry /out $CARRY_SITES
FROM scratch
COPY --from=export /out /
DOCKERFILE
            fail "could not read the hashed files of $source"

        for site in "$@"; do
            if [[ ! -d "$work/out/$site" ]]; then
                note "$source has no $site"
                continue
            fi
            hashed_files "$work/out/$site" > "$work/list"
            check_list "$work/list"
            # Only what this build lacks: the same name is the same content.
            LC_ALL=C comm -23 "$work/list" "$lists/$site.own" > "$work/new"
            while IFS= read -r path; do
                if [[ ! -e "$carried/$site/$path" ]]; then
                    mkdir -p "$(dirname "$carried/$site/$path")"
                    cp -p "$work/out/$site/$path" "$carried/$site/$path"
                fi
            done < "$work/new"
            total=$(wc -l < "$work/list")
            new=$(wc -l < "$work/new")
            note "$source: $((total)) hashed files of $site, $((new)) of them not in this build"
        done
    done
}

export_own() {
    local image_root=$1
    local out_dir=$2
    shift 2
    local site
    local list
    local path

    mkdir -p "$out_dir"
    for site in "$@"; do
        list="$image_root/srv/hashed-assets/$site.own"
        if [[ -f "$list" ]]; then
            check_list "$list"
        elif [[ -d "$image_root/www/$site" ]]; then
            # An image from before the lists carried nothing: every hashed
            # file in it is its own.
            list="$out_dir/.$site.own"
            hashed_files "$image_root/www/$site" > "$list"
            check_list "$list"
        else
            continue
        fi
        while IFS= read -r path; do
            [[ -f "$image_root/www/$site/$path" ]] ||
                fail "$list names $path, which the image lacks"
            mkdir -p "$(dirname "$out_dir/$site/$path")"
            cp -p "$image_root/www/$site/$path" "$out_dir/$site/$path"
        done < "$list"
        rm -f "$out_dir/.$site.own"
    done
}

merge() {
    local carried_dir=$1
    local www_dir=$2
    local list_dir=$3
    shift 3
    local site
    local path

    for site in "$@"; do
        [[ -f "$list_dir/$site.own" ]] || fail "$list_dir/$site.own is missing"
        hashed_files "$www_dir/$site" | cmp -s - "$list_dir/$site.own" ||
            fail "$list_dir/$site.own does not list the hashed files of $www_dir/$site"
        : > "$list_dir/$site.carried"
        if [[ -d "$carried_dir/$site" ]]; then
            hashed_files "$carried_dir/$site" > "$list_dir/.$site.staged"
            check_list "$list_dir/.$site.staged"
            while IFS= read -r path; do
                # The same name is the same content: this build's file stays.
                if [[ ! -e "$www_dir/$site/$path" ]]; then
                    mkdir -p "$(dirname "$www_dir/$site/$path")"
                    cp -p "$carried_dir/$site/$path" "$www_dir/$site/$path"
                    printf '%s\n' "$path" >> "$list_dir/$site.carried"
                fi
            done < "$list_dir/.$site.staged"
            rm -f "$list_dir/.$site.staged"
        fi
        note "$site: $(wc -l < "$list_dir/$site.own" | tr -d ' ') own hashed files, $(wc -l < "$list_dir/$site.carried" | tr -d ' ') carried"
    done
}

publish() {
    local image=$1
    local build_dir=$2
    shift 2
    local site
    local path

    : "${CARRY_PLATFORMS:?publishing needs CARRY_PLATFORMS}"
    work=$(mktemp -d)
    mkdir -p "$work/image/srv/hashed-assets"
    for site in "$@"; do
        [[ -f "$build_dir/hashed-assets/$site.own" ]] ||
            fail "$build_dir/hashed-assets/$site.own is missing: stage first"
        cp "$build_dir/hashed-assets/$site.own" "$work/image/srv/hashed-assets/$site.own"
        mkdir -p "$work/image/www/$site"
        while IFS= read -r path; do
            mkdir -p "$(dirname "$work/image/www/$site/$path")"
            cp -p "$build_dir/$site/$path" "$work/image/www/$site/$path"
        done < "$build_dir/hashed-assets/$site.own"
    done
    printf 'FROM scratch\nCOPY . /\n' > "$work/Dockerfile"
    docker buildx build --progress plain \
        --platform "$CARRY_PLATFORMS" \
        --file "$work/Dockerfile" \
        -t "$image" \
        --push \
        "$work/image"
}

command=${1:-}
case "$command" in
    stage)
        [[ $# -ge 3 ]] || fail 'usage: stage <build_dir> <site>...'
        shift
        stage "$@"
        ;;
    merge)
        [[ $# -ge 5 ]] || fail 'usage: merge <carried_dir> <www_dir> <list_dir> <site>...'
        shift
        merge "$@"
        ;;
    publish)
        [[ $# -ge 4 ]] || fail 'usage: publish <image> <build_dir> <site>...'
        shift
        publish "$@"
        ;;
    export)
        [[ $# -ge 4 ]] || fail 'usage: export <image_root> <out_dir> <site>...'
        shift
        export_own "$@"
        ;;
    *)
        fail "unknown command ${command:-<none>}: stage, merge, publish or export"
        ;;
esac
