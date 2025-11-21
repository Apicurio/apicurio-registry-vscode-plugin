'use strict';

import { group } from 'console';
import { Group, Artifact, ArtifactVersion, ArtifactVersionsList } from '../interfaces';
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

    public v2tov3Groups(groups: any[]) {
        const grps: Group[] = [];
        for (const key in groups) {
            grps.push(this.v2tov3Group(groups[key]));
        }
        return grps;
    }
    public v2tov3Group(group: any) {
        const grp: Group = {
            groupId: group.id,
            name: (group.name) ? group.name : '',
            description: (group.description) ? group.description : '',
            owner: (group.owner) ? group.owner : '',
            labels: (group.labels) ? group.labels : undefined,
            createdOn: (group.createdOn) ? group.createdOn : '',
            createdBy: (group.createdBy) ? group.createdBy : '',
            modifiedOn: (group.modifiedOn) ? group.modifiedOn : '',
            modifiedBy: (group.modifiedBy) ? group.modifiedBy : ''
        };
        return grp;
    }

    public v2tov3Artifacts(artifacts: any[]) {
        const arts: Artifact[] = [];
        for (const key in artifacts) {
            arts.push(this.v2tov3Artifact(artifacts[key]));
        }
        return arts;
    }

    public v2tov3Artifact(artifact: any) {
        const art: Artifact = {
            artifactId: artifact.id,
            groupId: artifact.groupId,
            name: (artifact.name) ? artifact.name : '',
            description: (artifact.description) ? artifact.description : '',
            createdOn: (artifact.createdOn) ? artifact.createdOn : '',
            createdBy: (artifact.createdBy) ? artifact.createdBy : '',
            modifiedOn: (artifact.modifiedOn) ? artifact.modifiedOn : '',
            modifiedBy: (artifact.modifiedBy) ? artifact.modifiedBy : '',
            owner: (artifact.owner) ? artifact.owner : '',
            labels: (artifact.labels) ? artifact.labels : undefined,
            state: (artifact.state) ? artifact.state : '',
            artifactType: (artifact.type) ? artifact.type : '',
        };
        return art;
    }

    public v2tov3Versions(versions: any[]) {
        const vers: ArtifactVersion[] = [];
        for (const key in versions) {
            vers.push(this.v2tov3Version(versions[key]));
        }
        return vers;
    }

    public v2tov3Version(version: any) {
        const ver: ArtifactVersion = {
            artifactId: version.id,
            groupId: version.groupId,
            version: version.version,
            branchId: this.getSettings().getDefault('branch'),
            artifactType: (version.type) ? version.type : '',
            globalId: (version.globalId) ? version.globalId : '',
            contentId: (version.contentId) ? version.contentId : '',
            name: (version.name) ? version.name : '',
            state: (version.state) ? version.state : '',
            owner: (version.owner) ? version.owner : '',
            description: (version.description) ? version.description : '',
            createdOn: (version.createdOn) ? version.createdOn : '',
            createdBy: (version.createdBy) ? version.createdBy : '',
            modifiedOn: (version.modifiedOn) ? version.modifiedOn : '',
            modifiedBy: (version.modifiedBy) ? version.modifiedBy : ''
        };
        // @TODO manage labels, properties and references
        return ver;
    }
}

export { Services };
