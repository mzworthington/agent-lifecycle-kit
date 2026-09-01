#!/usr/bin/env bash
# Detect / cut GitHub Releases from conventional commits (git-cliff notes).
# Package stays private; distribution is git tags + GitHub Releases (install via KIT_REF).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

emit() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s\n' "$1" >>"$GITHUB_OUTPUT"
  else
    echo "$1"
  fi
}

last_version_tag() {
  local from_gh=""
  if [[ -n "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]] && command -v gh >/dev/null 2>&1; then
    from_gh="$(gh release list --limit 200 --json tagName -q '.[].tagName' 2>/dev/null \
      | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
      | sort -V \
      | tail -1 || true)"
  fi
  if [[ -n "$from_gh" ]]; then
    printf '%s' "$from_gh"
    return 0
  fi
  git tag -l 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V \
    | tail -1 || true
}

bump_from_commits() {
  local since="$1"
  local range messages
  if [[ -n "$since" ]]; then
    range="${since}..HEAD"
  else
    range="HEAD"
  fi
  messages="$(git log --format=%s "$range" 2>/dev/null || true)"
  if [[ -z "$messages" ]]; then
    echo "none"
    return
  fi
  if echo "$messages" | grep -Eq '^(feat|fix|perf|refactor)(\(.+\))?!:|BREAKING CHANGE'; then
    echo "major"
    return
  fi
  if echo "$messages" | grep -Eq '^feat(\(.+\))?:'; then
    echo "minor"
    return
  fi
  if echo "$messages" | grep -Eq '^(fix|perf|refactor)(\(.+\))?:'; then
    echo "patch"
    return
  fi
  # docs/chore/ci/test alone do not cut a release
  echo "none"
}

next_version_tag() {
  local last bump version major minor patch
  last="$(last_version_tag)"
  bump="$1"
  if [[ -z "$last" ]]; then
    # First release: package.json is already 1.0.0
    echo "v1.0.0"
    return
  fi
  version="${last#v}"
  IFS='.' read -r major minor patch <<< "$version"
  case "$bump" in
    major) echo "v$((major + 1)).0.0" ;;
    minor) echo "v${major}.$((minor + 1)).0" ;;
    patch) echo "v${major}.${minor}.$((patch + 1))" ;;
    *) echo "$last" ;;
  esac
}

cmd_detect() {
  local head_msg last bump tag
  head_msg="$(git log -1 --format=%s)"
  if [[ "$head_msg" =~ ^chore\(changelog\): ]] \
    || [[ "$head_msg" =~ ^chore\(release\): ]] \
    || [[ "$head_msg" =~ ^chore\(derived\): ]]; then
    emit "skip=true"
    emit "release=false"
    echo "Skipping release: HEAD is a derived/release commit."
    return 0
  fi

  last="$(last_version_tag)"
  bump="$(bump_from_commits "$last")"
  if [[ "$bump" == "none" ]]; then
    emit "skip=false"
    emit "release=false"
    emit "bump=none"
    echo "No release-worthy conventional commits since ${last:-beginning}."
    return 0
  fi

  tag="$(next_version_tag "$bump")"
  # Avoid re-tagging the same version when last was empty→v1.0.0 already exists conceptually
  if [[ -n "$last" && "$tag" == "$last" ]]; then
    emit "skip=false"
    emit "release=false"
    echo "Next tag equals last tag; nothing to release."
    return 0
  fi

  emit "skip=false"
  emit "release=true"
  emit "bump=${bump}"
  emit "tag=${tag}"
  emit "since=${last}"
  echo "Will release ${tag} (bump=${bump}, since=${last:-none})"
}

cmd_notes() {
  local since="${1:-}"
  local cliff=(node_modules/.bin/git-cliff -c cliff.toml)
  if [[ -n "$since" ]]; then
    "${cliff[@]}" --latest --strip all "${since}..HEAD" 2>/dev/null \
      || "${cliff[@]}" "${since}..HEAD"
  else
    "${cliff[@]}" --unreleased --strip all 2>/dev/null \
      || "${cliff[@]}"
  fi
}

cmd_publish() {
  local tag="$1"
  local since="${2:-}"
  local notes_file target_sha
  notes_file="$(mktemp)"
  {
    echo "## ${tag}"
    echo ""
    cmd_notes "$since"
  } >"$notes_file"

  target_sha="$(git rev-parse HEAD)"
  if gh release view "$tag" >/dev/null 2>&1; then
    echo "Release ${tag} already exists; updating notes."
    gh release edit "$tag" --notes-file "$notes_file"
  else
    gh release create "$tag" \
      --title "Release ${tag}" \
      --notes-file "$notes_file" \
      --target "$target_sha"
  fi
  rm -f "$notes_file"
  echo "Published ${tag} at ${target_sha}"
}

usage() {
  cat <<'EOF'
Usage: bin/release.sh <detect|notes|publish> [args]

  detect              Emit GitHub Actions outputs for whether to release
  notes [since-tag]   Print git-cliff notes since tag (or unreleased)
  publish <tag> [since-tag]  Create/update GitHub Release
EOF
}

case "${1:-}" in
  detect) cmd_detect ;;
  notes) shift; cmd_notes "${1:-}" ;;
  publish)
    shift
    [[ -n "${1:-}" ]] || { usage >&2; exit 1; }
    cmd_publish "$1" "${2:-}"
    ;;
  -h|--help|help) usage ;;
  *) usage >&2; exit 1 ;;
esac
