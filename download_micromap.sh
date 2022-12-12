#!/bin/sh -e

while getopts t: flag
do
    case "${flag}" in
        t) token=${OPTARG};;
    esac
done

if [ -z $token ]
    then echo "DevPal Token is not set! Use -t <token>"; exit 1
fi

owner="topsify-io"
repo="devpal"
artifact="micromap.zip"
list_asset_url=https://api.github.com/repos/$owner/$repo/releases/latest
list_assets=$(curl -s -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $token" -H "X-GitHub-Api-Version: 2022-11-28" $list_asset_url)
tag_name=$(echo $list_assets | jq ".tag_name")

echo "Assets in release $tag_name (latest):"
echo $list_assets | jq ".assets[].name"

asset_url=$(echo $list_assets | jq ".assets[] | select(.name==\"$artifact\") | .url" | sed 's/\"//g')

echo "Downloading micromap.zip ($asset_url)"

# download the artifact
curl -sLo micromap.zip \
  -H 'Accept: application/octet-stream' \
  -H "Authorization: Bearer $token"\
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$asset_url"