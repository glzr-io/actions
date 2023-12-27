"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
async function run() {
    const { stdout, stderr } = await (0, node_child_process_1.exec)('npm --loglevel error ci --omit=dev', { cwd: node_path_1.default.resolve(__dirname) });
    try {
        const isPrelease = core.getBooleanInput('is_prerelease');
        const prereleaseTag = core.getInput('prerelease_tag');
        const repositoryUrl = core.getInput('repository_url');
        const npmPublish = core.getInput('npm_publish');
        const ghPublish = core.getInput('gh_publish');
        const plugins = [
            '@semantic-release/commit-analyzer',
            '@semantic-release/release-notes-generator',
        ];
        if (npmPublish) {
            plugins.push('@semantic-release/npm');
        }
        if (ghPublish) {
            plugins.push([
                '@semantic-release/github',
                {
                    successComment: false,
                    draftRelease: !isPrelease,
                },
            ]);
        }
        const result = await (await import('semantic-release')).default({
            branches: [
                {
                    name: 'main',
                    channel: isPrelease ? prereleaseTag : undefined,
                    prerelease: isPrelease,
                },
            ],
            repositoryUrl,
            plugins,
        });
        if (!result) {
            throw new Error('Failed to publish release.');
        }
        const { lastRelease, commits, nextRelease, releases } = result;
        core.debug(`Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`);
        if (lastRelease.version) {
            core.debug(`The last release was "${lastRelease.version}".`);
        }
        for (const release of releases) {
            core.debug(`The release was published with plugin "${release.pluginName}".`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}
exports.run = run;
run();
