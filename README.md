# DevPal GitHub Action

This action runs an API scan on your GitHub repository.

## Building

To build the actions script for release, run:
```
ncc build index.js
```

## Inputs

### `host`

The URL of the DevPal server to send the scan results to. Useful to specify if using
a self-hosted version of DevPal. (Default: `https://devpal.me`)

### `token`

**Required** The access token to be able to access the DevPal executables.

### `version`

Specify the version of DevPal's scanner to use. (Default: `latest`)

## Example usage

Below is an example of a full scan usage:

```yaml
jobs:
  scan:
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2
      - name: Test scan with Micromap
        uses: topsify-io/actions@v1.0.0
        with:
          host: https://devpal.me
          token: ${{ secrets.DEVPAL_TOKEN }}
          version: latest
```