'use strict';

interface ActiveElement {
    id: string;
    type: ElementType;
}

interface GroupList {
    groups: Group[];
    count?: number;
}
interface Group {
    groupId: string;
    name?: string;
    description?: string;
    owner?: string;
    labels?: string[];
    createdOn?: string;
    createdBy?: string;
    modifiedOn?: string;
    modifiedBy?: string;
    artifactList?: ArtifactList;
}

interface Meta {
}

interface ArtifactList {
    artifacts: Artifact[];
    count?: number;
}
interface Artifact {
    groupId: string;
    artifactId: string;
    globalId?: string;
    name?: string;
    state?: string;
    description?: string;
    artifactType?: string;
    owner?: string;
    labels?: string[];
    references?: ArtifactReference[];
    createdOn?: string;
    createdBy?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    children?: Artifact[];
}
interface BranchList {
    branches: Branch[]
    count?: number;
}
interface Branch {
    groupId: string;
    artifactId: string;
    branchId: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    owner?: string;
    systemDefined?: string;
}
interface ArtifactVersionsList {
    versions: ArtifactVersion[];
    count?: number;
}
interface ArtifactVersion {
    groupId: string;
    artifactId: string;
    version: string;
    branchId?: string;
    globalId?: string;
    contentId?: string;
    name?: string;
    state?: string;
    description?: string;
    artifactType?: string;
    owner?: string;
    labels?: string[];
    references?: ArtifactReference[];
    createdOn?: string;
    createdBy?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    children?: ArtifactVersion[];
}

interface ArtifactVersionCommentsEntry {
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

interface ArtifactReference {
    name: string;
    groupId: string;
    artifactId: string;
    version?: string;
}

enum ElementType {
    GROUP = "group",
    ARTIFACT = "artifact",
    VERSION = "version",
    BRANCH = "branch",
    META = "meta",
    COMMENT = "comment"
}
enum ArtifactType {
    AVRO = "AVRO",
    PROTOBUF = "PROTOBUF",
    GRAPHQL = "GRAPHQL",
    OPENAPI = "OPENAPI",
    JSONSchema = "JSON",
    KafkaConnect = "KCONNECT",
    AsyncAPI = "ASYNCAPI",
    WebServicesDescriptionLanguage = "WSDL",
    XMLSchema = "XSD"
}
enum ReferencesQueryParam {
    PRESERVE = "PRESERVE",
    DEREFERENCE = "DEREFERENCE",
    REWRITE = "REWRITE"
}
enum States {
    ENABLED = "ENABLED",
    DISABLED = "DISABLED",
    DEPRECATED = "DEPRECATED",
    DRAFT = "DRAFT"
}

export {
    ActiveElement,
    ElementType,
    ArtifactType,
    Group,
    GroupList,
    ArtifactList,
    Artifact,
    BranchList,
    Branch,
    ArtifactVersion,
    ArtifactVersionsList,
    Meta,
    ReferencesQueryParam,
    ArtifactVersionCommentsEntry,
    MetaEntry,
    CurrentArtifact,
    ArtifactReference,
    States
};
