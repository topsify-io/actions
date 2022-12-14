/* eslint-disable no-void */
import path, {dirname} from 'path';
import {mkdir, writeFile} from 'fs/promises';
import * as core from '@actions/core';
import * as github from '@actions/github';
import retry from 'async-retry';
import type {HeadersInit} from 'node-fetch';
import fetch from 'node-fetch';
import {execSync} from "child_process";
import * as os from "os";
import * as fs from "fs";

interface GetReleaseOptions {
    readonly owner: string;
    readonly repo: string;
    readonly version: string;
}

const getRelease = (
    octokit: ReturnType<typeof github.getOctokit>,
    {owner, repo, version}: GetReleaseOptions
) => {
    const tagsMatch = version.match(/^tags\/(.*)$/);
    if (version === 'latest') {
        return octokit.rest.repos.getLatestRelease({owner, repo});
    } else if (tagsMatch !== null && tagsMatch[1]) {
        return octokit.rest.repos.getReleaseByTag({
            owner,
            repo,
            tag: tagsMatch[1],
        });
    } else {
        return octokit.rest.repos.getRelease({
            owner,
            repo,
            release_id: Math.trunc(Number(version)),
        });
    }
};

type GetReleaseResult = ReturnType<typeof getRelease> extends Promise<infer T>
    ? T
    : never;

type Asset = GetReleaseResult['data']['assets'][0];

interface FetchAssetFileOptions {
    readonly id: number;
    readonly outputPath: string;
    readonly owner: string;
    readonly repo: string;
    readonly token: string;
}

const baseFetchAssetFile = async (
    octokit: ReturnType<typeof github.getOctokit>,
    {id, outputPath, owner, repo, token}: FetchAssetFileOptions
) => {
    const {
        body,
        headers: {accept, 'user-agent': userAgent},
        method,
        url,
    } = octokit.request.endpoint(
        'GET /repos/:owner/:repo/releases/assets/:asset_id',
        {
            asset_id: id,
            headers: {
                accept: 'application/octet-stream',
            },
            owner,
            repo,
        }
    );
    let headers: HeadersInit = {
        accept,
        authorization: `token ${token}`,
    };
    if (typeof userAgent !== 'undefined')
        headers = {...headers, 'user-agent': userAgent};

    const response = await fetch(url, {body, headers, method});
    if (!response.ok) {
        const text = await response.text();
        core.warning(text);
        throw new Error('Invalid response');
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    await mkdir(dirname(outputPath), {recursive: true});
    void (await writeFile(outputPath, new Uint8Array(arrayBuffer)));
};

const fetchAssetFile = (
    octokit: ReturnType<typeof github.getOctokit>,
    options: FetchAssetFileOptions
) =>
    retry(() => baseFetchAssetFile(octokit, options), {
        retries: 5,
        minTimeout: 1000,
    });

const filterByFileName = (file: string) => (asset: Asset) =>
    file === asset.name;

interface ChildProcess {
    readonly pid: number;
    readonly output: Array<string>;
    readonly stdout: Buffer | string;
    readonly stderr: Buffer | string;
    readonly status: number | null;
    readonly signal: string | null;
    readonly error: Error;

}

const micromap = (cwd: string, hostName: string, workingDirectory: string) => {
    try {
        execSync(`${cwd}/micromap -i ${workingDirectory} -o ${hostName}`);
    } catch (e: ChildProcess | any) {
        core.setFailed(e.output.join());
    }
}

const unzip = (outdir: string) => {
    try {
        execSync(`unzip micromap.zip -d ${outdir}`);
    } catch (e: ChildProcess | any) {
        core.setFailed(e.output.join());
    }
}

const main = async (): Promise<void> => {
    const owner = "topsify-io";
    const repo = "devpal";
    const hostName = core.getInput('host', {required: false});
    const token = core.getInput('token', {required: true});
    const version = core.getInput('version', {required: false});
    const target = "micromap.zip";
    const workingDirectory = process.env['GITHUB_WORKSPACE'];
    if (workingDirectory === undefined) {
        throw new Error("Unable to obtain $GITHUB_WORKSPACE env variable!");
    }

    const octokit = github.getOctokit(token);
    const release = await getRelease(octokit, {owner, repo, version});

    console.log(`Found latest release: ${release.data.tag_name}`);
    const assetFilterFn = filterByFileName(target);

    const assets = release.data.assets.filter(assetFilterFn);
    if (assets.length === 0) throw new Error('Could not find release artifact');
    else console.log(`Fetching API scanner...`);
    for (const asset of assets) {
        await fetchAssetFile(octokit, {
            id: asset.id,
            outputPath: target,
            owner,
            repo,
            token,
        });
    }

    try {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'micromap'));
        console.log(`Unpacking scanner...`);
        unzip(tmpDir);

        console.log("Scanning repository...");
        micromap(tmpDir, hostName, workingDirectory);
    } catch (e: any) {
        core.setFailed(e.message);
    }
};

console.log("Running DevPal Action");
void main();
