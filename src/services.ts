import * as vscode from 'vscode';
import { RegistryClient } from './registryClient';
import { Group } from './interfaces';

import { Settings } from './settings';

class Services {
    private static instance: Services;

    public static get() {
        if (this.instance == null) {
            this.instance = new this();
            this.instance.client = new RegistryClient();
        }
        return this.instance;
    }

    private client: RegistryClient;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() { }

    public getSettings() {
        return new Settings(); // TODO: We need to create a new instance in case the settings change.
    }

    public getRegistryClient() {
        return this.client;
    }

    public async test() {
        // console.log(await Services.get().getRegistryClient().searchArtifacts({ group: 'default' }));
    }
}

export { Services };
