'use strict';

import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { Services } from './services';
import { Settings } from './settings';
import { GroupList, ArtifactList, BranchList, ArtifactVersionsList, ActiveElement, ElementType, Artifact, ArtifactVersion, Group, ReferencesQueryParam } from '../interfaces';

class RegistryClient {
    private settings: Settings;
    constructor() {
        this.settings = new Settings();
    }

    /**
     * GET ACTIONS
     */
    public getArtifacts(group: ActiveElement, options?: object): Promise<ArtifactList> {
        const res = this.executeRequest(`groups/${group.id}/artifacts`, { ...options, ...this.settings.queryParamsPaginate(options) }) as Promise<ArtifactList>;
        return res;
    }
    public getBranches(group: ActiveElement, artifact: ActiveElement, options?: object): Promise<BranchList> {
        const res = this.executeRequest(`groups/${group.id}/artifacts/${artifact.id}/branches`, { ...options, ...this.settings.queryParamsPaginate(options) }) as Promise<BranchList>;
        return res;
    }
    public getArtifacttVersions(group: ActiveElement, artifact: ActiveElement, branch: ActiveElement, options?: object): Promise<ArtifactVersionsList> {
        let path = `groups/${group.id}/artifacts/${artifact.id}/branches/${branch.id}/versions`;
        if (this.settings.getApicurioApiVersion() == "v2") {
            path = `groups/${group.id}/artifacts/${artifact.id}/versions`;
        }
        const res = this.executeRequest(path, { ...options, ...this.settings.queryParamsPaginate(options) }) as Promise<ArtifactVersionsList>;
        return res;
    }
    public getArtifactContent(artifact: ArtifactVersion, references?: ReferencesQueryParam, options?: object, returnHeaders?: boolean) {
        // @TODO Manage references in query path.
        if (references) {
            const refParams = { 'references': (this.settings.getApicurioApiVersion() != "v2") ? references : true };
            options = Object.assign((options) ? options : {}, refParams);
        }
        let path = `groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/content`;
        if (this.settings.getApicurioApiVersion() == "v2") {
            path = `groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}`;
        }
        const res = this.executeRequest(path, options, undefined, undefined, undefined, returnHeaders) as Promise<any>;
        return res;
    }
    public getArtifactComment(artifact: ArtifactVersion, options?: object) {
        // @TODO Manage references in query path.
        const res = this.executeRequest(`groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/comments`, options) as Promise<any>;
        return res;
    }

    public async getGroups(options?: object): Promise<GroupList> {
        const res = this.executeRequest(`groups`, { ...options, ...this.settings.queryParamsPaginate(options) }) as Promise<GroupList>;
        return res;
    }

    public async getMetas(element: ActiveElement, data?: Group | Artifact | ArtifactVersion, options?: object): Promise<any> {
        let path = '';
        switch (element.type) {
            case ElementType.GROUP:
                path = `groups/${element.id}`;
                break;
            case ElementType.ARTIFACT:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}`;
                if (this.settings.getApicurioApiVersion() == "v2") {
                    path = `${path}/meta`;
                }
                break;
            case ElementType.VERSION:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}/versions/${(data as any).version}`;
                if (this.settings.getApicurioApiVersion() == "v2") {
                    path = `${path}/meta`;
                }
                break;
            case ElementType.BRANCH:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}/branches/${(data as any).branchId}`;
                break;
            default:
                break;
        }
        const res = this.executeRequest(`${path}`, { ...options, ...this.settings.queryParamsPaginate(options) }) as Promise<any>;
        return res;
    }
    public async getArtifactReferences(element: ArtifactVersion, options?: object): Promise<any> {
        const path = `groups/${element.groupId}/artifacts/${element.artifactId}/versions/${element.version}/references`;
        const res = this.executeRequest(`${path}`, options) as Promise<any>;
        return res;
    }
    public async getGroupRules(element: ActiveElement, options?: object): Promise<any> {
        const path = `groups/${element.id}/rules`;
        const res = this.executeRequest(`${path}`, options) as Promise<any>;
        return res;
    }
    public async getGroupRulesConfig(element: ActiveElement, rule: string, options?: object): Promise<any> {
        const path = `groups/${element.id}/rules/${rule}`;
        const res = this.executeRequest(`${path}`, options) as Promise<any>;
        return res;
    }
    public async getArtifactRules(element: Artifact, options?: object): Promise<any> {
        const path = `groups/${element.groupId}/artifacts/${element.artifactId}/rules`;
        const res = this.executeRequest(`${path}`, options) as Promise<any>;
        return res;
    }
    public async getArtifactRulesConfig(element: Artifact, rule: string, options?: object): Promise<any> {
        const path = `groups/${element.groupId}/artifacts/${element.artifactId}/rules/${rule}`;
        const res = this.executeRequest(`${path}`, options) as Promise<any>;
        return res;
    }

    /**
     * END of GET ACTIONS
     */


    /**
     * EDIT ACTIONS
     */
    public async createGroup(group: Group): Promise<Group> {
        const body = group;
        const res = this.executeRequest(
            `groups`,
            {},
            'POST',
            undefined,
            body
        ) as Promise<Group>;
        return res;
    }

    /**
     *  Execute HTTP request to Apicurio Registry API
     * @param path The API endpoint path
     * @param method The HTTP method to use (GET, POST, etc.)
     * @param headers Headers to include in the request
     * @param body The request body
     * @param returnHeaders Retuns a formated output.
     * @returns A promise that resolves with the response data
     */

    private executeRequest(path: string, queryParams?: any, method?: string, headers?: any, body?: any, returnHeaders?: boolean): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const settings = this.settings;
            const client = settings.useHttps ? https : http;

            if (!Services.get().isObject(headers)) {
                headers = {};
            }
            headers = {
                ...{ 'Content-Type': 'application/json', Accept: '*/*' },
                ...headers,
            };
            if (headers['Content-Type'].endsWith('yaml') || headers['Content-Type'].endsWith('yml')) {
                headers['Content-Type'] = 'application/x-yaml';
            }

            // Build request options so we can return them if requested
            const query = new URLSearchParams(queryParams).toString();
            const requestOptions = {
                hostname: settings.hostname,
                port: settings.port,
                path: `${encodeURI(settings.path.concat(path))}${query ? `?${query}` : ''}`,
                method: method ? method : 'GET',
                headers: headers
            } as any;
            const req = client.request(requestOptions, function (res) {
                const chunks: any[] = [];
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

                    const responseWrapper = {
                        _request: requestOptions,
                        _response: {
                            _headers: res.headers,
                            _body: output,
                            _statusCode: res.statusCode,
                        },
                    };

                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        // Try to surface structured error info when available
                        if (output != null && typeof output !== 'string') {
                            if ('name' in output && 'message' in output) {
                                vscode.window.showErrorMessage(
                                    `Apicurio Registry client error: ${output.name}: ${output.message} on path ${path}`
                                );
                                return reject(returnHeaders ? responseWrapper : output);
                            }
                        }
                        vscode.window.showErrorMessage(
                            `Apicurio Registry client error: Unknown: HTTP code ${res.statusCode} on path ${path}`
                        );
                        return reject(returnHeaders ? responseWrapper : output);
                    } else {
                        // // reject on bad status
                        // switch (res.statusCode) {
                        //     case 204:
                        //         // Fix resolution issue for no body 204 (PUT) responses on Apicurio API
                        //         resolve('');
                        //         break;
                        //     case 400:
                        //         // Fix resolution issue for 400 responses on Apicurio API
                        //         vscode.window.showErrorMessage('Apicurio : retrun a 400 error.');
                        //         resolve('');
                        //         break;
                        //     case 401:
                        //         // Fix resolution issue for 401 responses on Apicurio API
                        //         vscode.window.showErrorMessage(
                        //             'Apicurio Unauthorized : you have to login or grant more permissions.'
                        //         );
                        //         resolve('');
                        //         break;
                        //     case 404:
                        //         // Fix resolution issue for 404 responses on Apicurio API
                        //         vscode.window.showErrorMessage('Apicurio : Not found.');
                        //         resolve('');
                        //         break;
                        //     case 405:
                        //         // Fix resolution issue for 405 responses on Apicurio API
                        //         vscode.window.showErrorMessage('Apicurio : Fail due to method not allowed or disabled.');
                        //         resolve('');
                        //         break;
                        //     case 409:
                        //         // Fix resolution issue for 409 responses on Apicurio API
                        //         vscode.window.showErrorMessage('Apicurio : conflicts with existing data.');
                        //         resolve('');
                        //         break;
                        //     default:
                        //         break;
                        // }
                        // Return either the raw body or the wrapper containing headers and request
                        return resolve(returnHeaders ? responseWrapper : output);
                    }
                });
            });

            req.on('error', (e) => {
                vscode.window.showErrorMessage(`Apicurio Registry client error: ${e.name}: ${e.message} on path ${path}`);
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
