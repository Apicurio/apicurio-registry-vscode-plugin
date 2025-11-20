'use strict';

import { RegistryClient } from './registryClient';
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

    public isObject(value: unknown): value is object {
        return value instanceof Object && value.constructor === Object;
    }

    public async test() {
        // console.log(await Services.get().getRegistryClient().searchArtifacts({ group: 'default' }));
    }
}

export { Services };
