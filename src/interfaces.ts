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

interface MetaList {
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
    createdOn?: string;
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
    name?: string;
    state?: string;
    description?: string;
    artifactType?: string;
    owner?: string;
    createdOn?: string;
    modifiedBy?: string;
    modifiedOn?: string;
    children?: ArtifactVersion[];
}

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

interface ArtifactVersionEntry extends SearchEntry {
    version: string;
    createdOn: string;
    parent: boolean;
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

interface Search {
    property: string;
    propertyValue: string;
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
    MetaList,
    Meta,
    ReferencesQueryParam,
    SearchEntry,
    ArtifactVersionEntry,
    ArtifactVersionCommentsEntry,
    MetaEntry,
    CurrentArtifact,
    Search
};
