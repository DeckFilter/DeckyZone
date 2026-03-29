#!/usr/bin/env bash

set -e

if [ "$EUID" -eq 0 ]; then
  echo "Please do not run as root"
  exit
fi

github_api_url="https://api.github.com/repos/felixhirschfeld/DeckyZone/releases/latest"
package="DeckyZone"

echo "installing $package"

temp=$(mktemp -d)
sudo chmod -R +w "${HOME}/homebrew/plugins/"
plugin_dir="${HOME}/homebrew/plugins/${package}"
sudo mkdir -p $plugin_dir

use_jq=false
if [ -x "$(command -v jq)" ]; then
  use_jq=true
fi

RELEASE=$(curl -s "$github_api_url")

if [[ $use_jq == true ]]; then
  echo "Using jq"
  MESSAGE=$(echo "$RELEASE" | jq -r '.message')
  RELEASE_VERSION=$(echo "$RELEASE" | jq -r '.tag_name')
  RELEASE_URL=$(echo "$RELEASE" | jq -r '(.assets // [])[] | select(.name | endswith(".tar.gz")) | .browser_download_url' | head -n 1)
else
  MESSAGE=$(echo "$RELEASE" | tr ',' '\n' | grep '"message"' | cut -d '"' -f 4)
  RELEASE_URL=$(echo "$RELEASE" | tr ',' '\n' | grep '"browser_download_url"' | grep '\.tar\.gz' | cut -d '"' -f 4 | head -n 1)
  RELEASE_VERSION=$(echo "$RELEASE" | tr ',' '\n' | grep '"tag_name"' | cut -d '"' -f 4)
fi

if [[ "$MESSAGE" != "null" && -n "$MESSAGE" ]]; then
  echo "error: $MESSAGE" >&2
  exit 1
fi

if [ -z "$RELEASE_VERSION" ]; then
  echo "Failed to determine latest release version" >&2
  exit 1
fi

if [ -z "$RELEASE_URL" ]; then
  echo "Failed to get latest release tarball" >&2
  exit 1
fi

temp_file="${temp}/${package}.tar.gz"

echo "Downloading $package $RELEASE_VERSION"
curl -L "$RELEASE_URL" -o "$temp_file"

tar -xzf "$temp_file" -C $temp
sudo rsync -av "${temp}/${package}/" $plugin_dir --delete

rm "$temp_file"
sudo systemctl restart plugin_loader.service
