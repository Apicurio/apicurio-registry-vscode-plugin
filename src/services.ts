import * as vscode from 'vscode';
import { RegistryClient } from './registryClient';

class Settings {
    public readonly hostname: string | null | undefined;
    public readonly port: number | string | null | undefined;
    public readonly path: string | null | undefined;
    public readonly limit: number;
    public readonly useHttps: boolean;

    constructor() {
        this.hostname = vscode.workspace.getConfiguration('apicurio.http').get('host');
        this.port = vscode.workspace.getConfiguration('apicurio.http').get('port');
        this.path = vscode.workspace.getConfiguration('apicurio.http').get('path');
        this.limit = vscode.workspace.getConfiguration('apicurio.search').get('limit');
        this.useHttps = vscode.workspace.getConfiguration('apicurio.http').get('secure');
    }

    public limits(): object {
        return {
            limit: this.limit,
            offset: 0,
        };
    }
}

class Services {
    private static instance: Services;

    public static get() {
        if (this.instance == null) {
            this.instance = new this();
            this.instance.settings = new Settings();
            this.instance.client = new RegistryClient(this.instance.settings);
        }
        return this.instance;
    }

    private settings: Settings;
    private client: RegistryClient;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    public getSettings() {
        return this.settings;
    }

    public getRegistryClient() {
        return this.client;
    }

    public async test() {
        console.log(await Services.get().getRegistryClient().searchArtifacts({ group: 'default' }));
    }
}

export { Settings, Services };
