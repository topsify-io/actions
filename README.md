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

```yaml
uses: actions/devpal@v1
with:
  remote-host: 'https://devpal.me'
  devpal-token: <token>
```