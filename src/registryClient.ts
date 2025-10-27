import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { Services, Settings } from './services';
import { isObject } from './utils';
import { isArray } from 'util';
import { GroupList, ArtifactList, BranchList, ArtifactVersionsList, ActiveElement, ElementType, Artifact, ArtifactVersion, Group, ReferencesQueryParam } from './interfaces';
import path from 'path';

interface SearchedArtifact {
    groupId: string | undefined;
    description: string | undefined;
    artifactId: string;
    name: string;
    createdOn: string;
    createdBy: string;
    artifactType: string;
    modifiedBy: string;
    modifiedOn: string;
    state: string;
}

interface ArtifactSearchResult {
    artifacts: [SearchedArtifact];
    count: number;
}

// interface ApicurioError {
//     message: string,
//     error_code: number,
//     detail: string,
//     name: string
// }

const DEFAULT_GROUP_ID = 'default';

class RegistryClient {
    public getArtifacts(group: ActiveElement, options?: object): Promise<ArtifactList> {
        const res = this.executeRequest(
            this.requestPath(`groups/${group.id}/artifacts`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<ArtifactList>;
        return res;
    }
    public getBranches(group:ActiveElement, artifact: ActiveElement, options?: object): Promise<BranchList> {
        const res = this.executeRequest(
            this.requestPath(`groups/${group.id}/artifacts/${artifact.id}/branches`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<BranchList>;
        return res;
    }
    public getArtifacttVersions(group:ActiveElement, artifact: ActiveElement, branch: ActiveElement, options?: object): Promise<ArtifactVersionsList> {
        const res = this.executeRequest(
            this.requestPath(`groups/${group.id}/artifacts/${artifact.id}/branches/${branch.id}/versions`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<ArtifactVersionsList>;
        return res;
    }

    public getArtifactContent(artifact:ArtifactVersion, references?:ReferencesQueryParam, options?: object){
        // @TODO Manage references in query path.
        const res = this.executeRequest(
            this.requestPath(`groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/content`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<any>;
        return res;
    }
    public getArtifactComment(artifact:ArtifactVersion, options?: object){
        // @TODO Manage references in query path.
        const res = this.executeRequest(
            this.requestPath(`groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/comments`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<any>;
        return res;
    }

    public searchArtifacts(options?: object): Promise<ArtifactSearchResult> {
        const res = this.executeRequest(
            this.requestPath(`search/artifacts`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<ArtifactSearchResult>;
        return res.then((x) => this.fixDefaultGroup(x));
    }

    public async getGroups(options?: object): Promise<GroupList>{
        const res = this.executeRequest(
            this.requestPath(`groups`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<GroupList>;
        return res;
    }

    public async getMetas(element: ActiveElement, data?:Group|Artifact|ArtifactVersion, options?: object): Promise<any>{
        let path = '';
        switch (element.type) {
            case ElementType.GROUP:
                path = `groups/${element.id}`;
                break;
            case ElementType.ARTIFACT:
                path = `groups/${data.groupId}/artifacts/${data.artifactId}`;
                break;
            case ElementType.VERSION:
                path = `groups/${data.groupId}/artifacts/${data.artifactId}/versions/${data.version}`;
                break;
            case ElementType.BRANCH:
                path = `groups/${data.groupId}/artifacts/${data.artifactId}/branches/${data.branchId}`;
                break;
            default:
                break;
        }
        const res = this.executeRequest(
            this.requestPath(`${path}`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<any>;
        return res;
    }
    public async getGroupRules(element: ActiveElement, options?: object): Promise<any>{
        let path = `groups/${element.id}/rules`;
        const res = this.executeRequest(
            this.requestPath(`${path}`, {
                ...Services.get().getSettings().limits(),
                ...options,
            })
        ) as Promise<any>;
        return res;
    }

    private fixDefaultGroup(result: ArtifactSearchResult) {
        for (const i in result.artifacts) {
            if (!result.artifacts[i].groupId) {
                result.artifacts[i].groupId = DEFAULT_GROUP_ID;
            }
        }
        return result;
    }

    private requestPath(path: string, params?: object) {
        let query = '';
        for (const key in params) {
            query = `${query}${!query ? '?' : '&'}${key}=${params[key]}`;
        }
        return `${path}${query}`;
    }

    /**
     *  Execute HTTP request to Apicurio Registry API
     * @param path The API endpoint path
     * @param method The HTTP method to use (GET, POST, etc.)
     * @param headers Headers to include in the request
     * @param body The request body
     * @returns A promise that resolves with the response data
     */

    private executeRequest(path: string, method?: string, headers?: any, body?: any): Promise<object | string | null> {
        return new Promise<object | string>((resolve, reject) => {
            const settings = Services.get().getSettings();
            const client = settings.useHttps ? https : http;

            if (!isObject(headers)) {
                headers = {};
            }
            headers = {
                ...{ 'Content-Type': 'application/json', Accept: '*/*' },
                ...headers,
            };
            if (headers['Content-Type'].endsWith('yaml') || headers['Content-Type'].endsWith('yml')) {
                headers['Content-Type'] = 'application/x-yaml';
            }

// vscode.window.showInformationMessage(`Path is ${JSON.stringify(path)}`);
            const req = client.request(
                {
                    hostname: settings.hostname,
                    port: settings.port,
                    path: `${encodeURI(settings.path.concat(path))}`,
                    method: method ? method : 'GET',
                    headers: headers,
                },
                function (res) {
                    const chunks = [];
                    res.on('data', function (chunk) {
                        chunks.push(chunk);
                    });

                    res.on('end', () => {
                        let output: object | string | null = null;
                        const data = Buffer.concat(chunks);
                        if (data.length > 0) {
                            try {
                                output = JSON.parse(data.toString());
                            } catch (e) {
                                output = data.toString();
                            }
                        }
// vscode.window.showInformationMessage(`output is ${JSON.stringify(output)}`);
                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            if (output != null && typeof output !== 'string') {
                                if ('name' in output && 'message' in output) {
                                    vscode.window.showErrorMessage(
                                        `Apicurio Registry client error: ${output.name}: ${output.message}`
                                    );
                                    return reject(output);
                                }
                            } else {
                                vscode.window.showErrorMessage(
                                    `Apicurio Registry client error: Unknown: HTTP code ${res.statusCode}`
                                );
                                return reject(output);
                            }
                        } else {
                                /**
                                 * Add some retro compatibility data when Apicurio is V2
                                 */
                                if (vscode.workspace.getConfiguration('apicurio.api').get('version') == "v2"){
                                    if (isObject(output) && Array.isArray(output['artifacts'])) {
                                        for (var i in output['artifacts']) {
                                            let v2 = {artifactId: output['artifacts'][i].id, artifactType: output['artifacts'][i].type}; // Fix missing fields on v2 API
                                            output['artifacts'][i] = Object.assign(v2, output['artifacts'][i]);
                                        }
                                    }
                                }
        // vscode.window.showInformationMessage(`output is ${JSON.stringify(output)}`);
                            return resolve(output);
                        }
                    });
                }
            );

            req.on('error', (e) => {
                vscode.window.showErrorMessage(`Apicurio Registry client error: ${e.name}: ${e.message}`);
                return reject(e);
            });

            if (body) {
                if (typeof body !== 'string') {
                    body = JSON.stringify(body);
                }
                req.write(body);
            }

            req.end();
        });
    }
}

export { RegistryClient };
