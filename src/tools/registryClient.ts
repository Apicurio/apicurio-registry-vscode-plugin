'use strict';

import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import { Services } from './services';
import { Settings } from './settings';
import { GroupList, ArtifactList, BranchList, ArtifactVersionsList, ActiveElement, ElementType, Artifact, ArtifactVersion, Group, ReferencesQueryParam, States, Branch } from '../interfaces';

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
            let refParams: { references?: ReferencesQueryParam; dereference?: boolean } = { 'references': references };
            if (this.settings.getApicurioApiVersion() == "v2") {
                refParams = { 'dereference': true };
            }
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

    public async addArtifactComment(artifact: ArtifactVersion, comment: string): Promise<any> {
        const body = {
            'value': comment
        };
        const res = this.executeRequest(
            `groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/comments`,
            {},
            'POST',
            undefined,
            body
        ) as Promise<any>;
        return res;
    }

    public async createArtifact(group: ActiveElement, artifactType: string, artifactId: string, name: string, description: string): Promise<Artifact> {
        const body = {
            'artifactId': artifactId,
            'artifactType': artifactType,
            'name': name,
            'description': description
        };
        const res = this.executeRequest(
            `groups/${group.id}/artifacts`,
            {},
            'POST',
            undefined,
            body
        ) as Promise<any>;
        return res;
    }

    public async createArtifactVersion(version: string, artifact: Artifact, fileExt:string, content: any): Promise<ArtifactVersion> {
        let contentType = 'application/json';
        // Determine content type based on file extension
        switch (fileExt.toLowerCase()) {
            case '.yaml':
            case '.yml':
                contentType = 'application/x-yaml';
                break;
            case '.xml':
                contentType = 'application/xml';
                break;
            default:
                contentType = 'application/json';
        }
        // Build request body
        const body: any = {
            'version': version,
            'content': {
                'content': content.toString(),
                'contentType': contentType,
                'references': []
            },
            'name': artifact.name,
            'description': artifact.description,
            'labels': artifact.labels,
            'branch': [this.settings.getDefault('branch')],
            'isDraft': this.settings.createAsDraft()
        };
        const res = this.executeRequest(
            `groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions`,
            {},
            'POST',
            undefined,
            body
        ) as Promise<ArtifactVersion>;
        return res;
    }

    /**
     * Manage artifact States
     * @param artifact 
     * @param state 
     * @returns 
     */
    public async changeArtifactVersionState(artifact: ArtifactVersion, state: string): Promise<any> {
        const body = {
            'state': state
        };
        const res = this.executeRequest(
            `groups/${artifact.groupId}/artifacts/${artifact.artifactId}/versions/${artifact.version}/state`,
            {},
            'PUT',
            undefined,
            body
        ) as Promise<any>;
        return res;
    }

    /**
     * Manage Objects Metas: Labels, Description, Owner, Name
     * For custom metas as state, properties, references, etc. use dedicated functions.
     */
    /**
     * Add or update a label on an element.
     * @param element 
     * @param data 
     * @param labelKey 
     * @param labelValue 
     * @returns 
     */
    public async editLabel(element: ActiveElement, data: Group | Artifact | ArtifactVersion | Branch, labelKey: string, labelValue: string): Promise<any> {
        let metas = this.returnEditableMetasObject(element, data);
        metas.labels = {...metas.labels, ...{ [labelKey]: labelValue } };
        vscode.window.showInformationMessage(`Updated metas: ${JSON.stringify(metas)}`);
        await this.editMetas(element, data, metas);
        return;
    }
    /**
     * No need of edit label function, editLabel will overwrite existing label key.
     */
    /**
     * Remove a label from an element.
     * @param element 
     * @param data 
     * @param labelKey 
     * @returns 
     */
    public async removeLabel(element: ActiveElement,  data: Group | Artifact | ArtifactVersion | Branch, labelKey: string): Promise<any> {
        let metas = this.returnEditableMetasObject(element, data);
        if (metas.labels && metas.labels[labelKey]) {
            delete metas.labels[labelKey];
        }   
        await this.editMetas(element, data, metas);
        return;
    }
    public async editDescription(element: ActiveElement, data: Group | Artifact | ArtifactVersion | Branch, description: string): Promise<any> {
        let metas = this.returnEditableMetasObject(element, data);
        metas.description = description;
        await this.editMetas(element, data, metas);
        return;
    }
    public async editName(element: ActiveElement, data: Artifact | ArtifactVersion, name: string): Promise<any> {
        let metas = this.returnEditableMetasObject(element, data);
        metas.name = name;
        await this.editMetas(element, data, metas);
        return;
    }
    /**
     * Return an object containing only editable metas depending on the element type.
     * @param element 
     * @param data 
     * @returns 
     */
    private returnEditableMetasObject(element: ActiveElement, data: any ): any {
        let metas: any = {};
        switch (element.type) {
            case ElementType.GROUP:
                metas = {
                    description: (data.description) ? data.description : '',
                    labels: (data.labels) ? data.labels : {}
                };
                break;
            case ElementType.ARTIFACT:
                metas = {
                    name: (data.name) ? data.name : '',
                    description: (data.description) ? data.description : '',
                    labels: (data.labels) ? data.labels : {}
                };
                // add owner only if exists to avoid API error.
                if (data.owner) {
                    metas.owner = data.owner;
                }
                break;
            case ElementType.VERSION:
                metas = {
                    name: (data.name) ? data.name : '',
                    description: (data.description) ? data.description : '',
                    labels: (data.labels) ? data.labels : {}
                };
                break;
            case ElementType.BRANCH:
                metas = {
                    description: (data.description) ? data.description : '',
                };
                break;
            default:
                break;
        }
        return metas;
    }
    /**
     * Update metas of an element.
     * @param element 
     * @param data 
     * @param metas 
     * @returns 
     */
    public async editMetas(element: ActiveElement, data: Group | Artifact | ArtifactVersion | Branch, metas: any): Promise<any> {
        let path = '';
        switch (element.type) {
            case ElementType.GROUP:
                path = `groups/${element.id}`;
                break;
            case ElementType.BRANCH:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}/branches/${(data as any).branchId}`;
                break;
            case ElementType.ARTIFACT:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}`;
                break;
            case ElementType.VERSION:
                path = `groups/${(data as any).groupId}/artifacts/${(data as any).artifactId}/versions/${(data as any).version}`;
                break;
            default:
                break;
        }
        const res = this.executeRequest(
            `${path}`,
            {},
            'PUT',
            { 'Content-Type': 'application/json' },
            metas
        ) as Promise<any>;
        return res;
    }

    /**
     * END of EDIT ACTIONS
     */

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
                                    `Apicurio Registry client ${res.statusCode} error: ${output.name}: ${output.message} on path ${path}`
                                );
                                return reject(returnHeaders ? responseWrapper : output);
                            }
                        }
                        else {
                            vscode.window.showErrorMessage(
                                `Apicurio Registry client ${res.statusCode} error: on path ${path}`
                            );
                        }
                        return reject(returnHeaders ? responseWrapper : output);
                    } else {
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
