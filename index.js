const core = require('@actions/core');
const github = require('@actions/github');
const child_process = require('child_process');

async function micromap(remoteHost) {
  try {
    child_process.execSync(`micromap -i $GITHUB_WORKSPACE -o ${remoteHost}`);
    return { status: 0,  message: "OK"};
  } catch (e) {
    return { status: e.status,  message: e.stderr.toString()};
  }
}

async function unzip() {
  try {
    child_process.execSync(`unzip micromap.zip`);
    return { status: 0,  message: "OK"};
  } catch (e) {
    return { status: e.status,  message: e.stderr.toString()};
  }
}

try {
  const remoteHost = core.getInput('remote-host');
  console.log('Preparing Micromap...');
  const {zipCode, zipMsg} = await unzip();
  if (zipCode != 0) {
    throw new Error(`Unable to unpack Micromap executable! Error: ${zipMsg}`);
  }
  console.log('Running scan...');
  const {microCode, microMsg} = await micromap(remoteHost);
  if (microCode != 0) {
    throw new Error(`Unable to scan code repository! Error: ${microMsg}`);
  } else {
    console.log(`Scan successful! Results sent to ${remoteHost}`)
  }
} catch (error) {
  core.setFailed(error.message);
}