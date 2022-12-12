# DevPal GitHub Action

This action runs an API scan on your GitHub repository.

## Inputs

### `remote-host`

The URL of the DevPal server to send the scan results to. Useful to specify if using
a self-hosted version of DevPal.

### `devpal-token`

**Required** The access token to be able to access the DevPal executables.

## Example usage

```yaml
uses: actions/devpal@v1
with:
  remote-host: 'https://devpal.me'
  devpal-token: <token>
```