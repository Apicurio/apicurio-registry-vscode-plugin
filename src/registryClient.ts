import { Settings } from './services';
import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

interface SearchedArtifact {
    groupId: string | undefined;
    description: string | undefined;
    id: string;
    name: string;
    createdOn: string;
    createdBy: string;
    type: string;
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
    private settings: Settings;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    public getArtifacts(): Promise<ArtifactSearchResult> {
        return this.searchArtifacts();
    }

    public searchArtifacts(options?: object): Promise<ArtifactSearchResult> {
        const res = this.executeRequest(
            this.requestPath(`search/artifacts`, {
                ...this.settings.limits(),
                ...options,
            })
        ) as Promise<ArtifactSearchResult>;
        return res.then((x) => this.fixDefaultGroup(x));
    }

    public async getGroups(): Promise<string[]> {
        const response = await this.getArtifacts();
        const groups = new Set<string>();
        for (const artifact of response.artifacts) {
            groups.add(artifact.groupId);
        }
        return [...groups];
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

    private executeRequest(path: string, method?: string, headers?: any, body?: any): Promise<object | string | null> {
        return new Promise<object | string>((resolve, reject) => {
            const client = this.settings.useHttps ? https : http;

            headers = {
                Accept: '*/*',
                'Content-Type': 'application/json',
                ...headers,
            };

            if (headers['Content-Type'].endsWith('yaml') || headers['Content-Type'].endsWith('yml')) {
                headers['Content-Type'] = 'application/x-yaml';
            }

            const req = client.request(
                {
                    hostname: this.settings.hostname,
                    port: this.settings.port,
                    path: `${this.settings.path}${path}`,
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
