import { getInput, setFailed } from '@actions/core';
import { execSync } from 'child_process';
import { stringify } from 'querystring';
const https = require('https');
const fs = require('fs');

const workingDirectory = process.env.GITHUB_WORKSPACE

function micromap(remoteHost) {
  try {
    execSync(`micromap -i $GITHUB_WORKSPACE -o ${remoteHost}`, { cwd: workingDirectory });
    return { status: 0, message: "OK" };
  } catch (e) {
    return { status: e.status, message: stringify(e) };
  }
}

/**
 * Uses the release path and token to obtain the download URL for a given asset name.
 * @param {String} releasePath the path to append to the GitHub API.
 * @param {String} assetName the name of the asset to look for.
 * @param {String} token the GitHub access token.
 */
function getAssetDownloadURL(releasePath, assetName, token) {
  const options = {
    host: 'https://api.github.com',
    port: 443,
    path: releasePath,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  let downloadUrl = null;
  https.get(options,
    (response) => {
      response.on('end', (req) => {
        console.log(stringify(req));
        const data = req.data;
        console.log(stringify(data));
        const tagName = data.tag_name;
        console.log(`Latest release is ${tagName}`);
        const matchedAssets = d.assets.filter(x => x === assetName);
        if (matchedAssets.size > 1) {
          downloadUrl = matchedAssets[0];
        }
      });
    });
  return downloadUrl;
}

/**
 * Downloads a file from the given URL and writes the file using the given output file name.
 * @param {String} url download URL.
 * @param {String} outFile the output file name.
 * @param {String} token the GitHub access token.
 */
function downloadFileFromGitHub(url, outFile, token) {
  const file = fs.createWriteStream(outFile);
  const options = {
    host: 'https://api.github.com',
    port: 443,
    path: url.replace('https://api.github.com', ''),
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  let status = false;
  https.get(options, (response) => {
    response.pipe(file);

    file.on("finish", () => {
      file.close();
      console.log(`Download completed, file written to '${file.path}'`);
      status = true;
    });
  });
  return status;
}

function unzip() {
  try {
    execSync(`unzip micromap.zip`, { cwd: workingDirectory });
    return { status: 0, message: "OK" };
  } catch (e) {
    return { status: e.status, message: stringify(e) };
  }
}

try {
  const releasesURL = "/repos/topsify-io/devpal/releases/latest"
  const devpalToken = getInput('devpal-token');
  const remoteHost = getInput('remote-host');
  const micromapDownloadURL = getAssetDownloadURL(releasesURL, "micromap.zip", devpalToken);
  if (micromapDownloadURL === null) {
    throw new Error(`Unable to find latest Micromap executable from releases!`);
  }

  console.log('Downloading micromap.zip...');
  if (!downloadFileFromGitHub(micromapDownloadURL, "micromap.zip", devpalToken)) {
    throw new Error(`Unable to download the Micromap executable! Error: ${downloadResponse.message}`);
  }

  console.log('Preparing Micromap...');
  const zipResponse = unzip();
  if (zipResponse.status !== 0) {
    throw new Error(`Unable to unpack Micromap executable! Error: ${zipResponse.message}`);
  }

  console.log('Running scan...');
  const scanResponse = micromap(remoteHost);
  if (scanResponse.status !== 0) {
    throw new Error(`Unable to scan code repository! Error: ${scanResponse.message}`);
  } else {
    console.log(`Scan successful! Results sent to ${remoteHost}`)
  }
} catch (error) {
  setFailed(error.message);
}