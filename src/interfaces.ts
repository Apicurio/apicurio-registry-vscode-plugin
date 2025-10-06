import { TreeItem } from "vscode";

interface SearchEntry {
    groupId: string;
    artifactId: string;
    name: string;
    description: string;
    artifactType: string;
    state: string;
    version?: string;
    parent: boolean;
}

interface VersionEntry extends SearchEntry {
    version: string;
    createdOn: string;
    parent: boolean;
}

interface VersionCommentsEntry {
    commentId: string;
    value: string;
    owner: string;
    createdOn: string;
}

interface MetaEntry {
    meta: string;
    value: string;
    labels?: string[];
    properties?: any;
    activeMeta?: string;
}

interface CurrentArtifact {
    group: string;
    artifactId: string;
    version?: string;
}

interface Search {
    property: string;
    propertyValue: string;
}

export { SearchEntry, VersionEntry, VersionCommentsEntry, MetaEntry, CurrentArtifact, Search };
