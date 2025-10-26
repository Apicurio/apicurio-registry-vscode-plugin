'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, ArtifactVersionsList, ArtifactVersion, BranchList, Branch, Artifact, ReferencesQueryParam } from './interfaces';
import { ApicurioTools } from './tools';
import { Services } from './services';
import { version } from 'os';

namespace _ {
    export const tools = new ApicurioTools();
}

/**
 * Apicurio Explorer Provider
 */

/**
 * Tree data provider for Apicurio ArtifactVersions Explorer view
 * 
 * This view retrive ArtifactVersions in Branch and manage callbacks for :
 *  - Display artifactVersionss
 *  - Contextual menu on artifactVersionss
 *  - @TODO Manage References (in & Outbound)
 * 
 */

/**
 * /!\ The names artifactVersion and artifactVersions are reserved in Javascript.
 * artifactArtifactVersion and artifactArtifactVersions are used instead.
 */

export class ApicurioArtifactVersionsExplorerProvider implements vscode.TreeDataProvider<Group> {
    private readonly extensionUri: any;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };
    private ActiveArtifact: ActiveElement = { id: null, type: ElementType.ARTIFACT };
    private ActiveBranch: ActiveElement = { id: _.tools.getDefault('branch'), type: ElementType.BRANCH };

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        // Manage events for window refresh.
        this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<any>();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    }

    /**
     * General management of the view
     */

    // Refresh the view
    public refresh(group?: ActiveElement, artifact?: ActiveElement, branch?: ActiveElement): any {
        if(group){
            this.ActiveGroup.id = group.id;
        }
        if(artifact){
            this.ActiveArtifact.id = artifact.id;
        }
        if(branch){
            this.ActiveBranch.id = (branch.id) ? branch.id : _.tools.getDefault('branch');
        }
        else if (!this.ActiveBranch.id){
            this.ActiveBranch.id = _.tools.getDefault('branch');
        }
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get ArtifactVersions
    private getArtifactsVersions(): Promise<ArtifactVersion[]> {
        let result = Services.get().getRegistryClient().getArtifacttVersions(this.ActiveGroup, this.ActiveArtifact, this.ActiveBranch);
        let artifacts: Promise<ArtifactVersion[]> = result.then(res => res.versions);
        return artifacts;
    }

    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    /**
     * Select a artifactVersions from the explorer view
     * @param artifact The selected group
     */
    public selectArtifact(artifact: Artifact, branch?:Branch): void {
        this.ActiveArtifact.id = artifact.artifactId;
        this.ActiveGroup.id = artifact.groupId;
        this.ActiveBranch.id = _.tools.getDefault('brach');
        if(branch){
            this.ActiveBranch.id = branch.branchId;
        }
        this.refresh();
    }

    public selectArtifactVersion(artifactVersion: ArtifactVersion): void {
        // As api do not return full Barnch object, compement it here
        artifactVersion.artifactId = this.ActiveArtifact.id;
        artifactVersion.groupId = this.ActiveGroup.id;
        // vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.selectArtifactVersion', {groupId:this.ActiveGroup.id, artifactId:this.ActiveArtifact.id, branchId:this.ActiveBranch.id} as ArtifactVersion, artifactVersion);
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', {id:artifactVersion.artifactId, type:ElementType.VERSION} as ActiveElement, artifactVersion);
    }

    public openVersionReferences(artifact:ArtifactVersion){
        this.openVersion(artifact, ReferencesQueryParam.REWRITE);
    }
    public openVersion(artifact:ArtifactVersion, references?:ReferencesQueryParam){
        let result = Services.get().getRegistryClient().getArtifactContent(artifact, references);
        let artifactContent: Promise<any> = result.then(res => res.versions);
        // Get Type From header : X-Registry-ArtifactType
        // Type Content-Type: application/x-yaml
        let contentType;
        let extention;
        // extention = this.getFileExtention(artifact.artifactType, contentType);

        // Manage document
        const wsDirPath = this.getWorkspaceDirPath();
        let fileName: string = `${artifact.groupId}--${artifact.artifactId}--${artifact.version}.${extention}`;
        if (wsDirPath != undefined) {
            fileName = `${wsDirPath}/${fileName}`;
        } else {
            vscode.window.showWarningMessage(`Could not determine full workspace path for file '${fileName}'.`);
        }
        const newUri = vscode.Uri.file(fileName).with({ scheme: 'untitled', path: fileName });
        vscode.workspace.openTextDocument(newUri).then(
            (a: vscode.TextDocument) => {
                vscode.window.showTextDocument(a, 1, false).then((e) => {
                    e.edit((edit) => {
                        edit.insert(new vscode.Position(0, 0), JSON.stringify(artifactContent));
                    });
                });
            },
            (error: any) => {
                console.error(error);
            }
        );
        // Format Document
        if (vscode.workspace.getConfiguration('apicurio.tools.preview').get('format')) {
            // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger command...
            setTimeout(() => {
                vscode.commands.executeCommand('editor.action.formatDocument');
            }, 500);
        }
        // Preview if available
        if (
            vscode.workspace.getConfiguration('apicurio.tools.preview').get('OPENAPI') &&
            vscode.extensions.getExtension('Arjun.swagger-viewer')
        ) {
            if (artifact.artifactType == 'OPENAPI') {
                // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger preview command...
                setTimeout(() => {
                    vscode.commands.executeCommand('swagger.preview');
                }, 500);
            }
        }
        return Promise.resolve();
    }

    getFileExtention(artifactType, contentType){
        return '';
    }
    getWorkspaceDirPath(): string | undefined {
        const lastOpenFilePath: string | undefined = vscode.window.activeTextEditor?.document.fileName;
        const workspaces = vscode.workspace.workspaceFolders?.map((dir) => dir.uri.fsPath);
        if (workspaces !== undefined) {
            if (workspaces.length === 1) {
                return workspaces[0];
            }
            if (lastOpenFilePath !== undefined && workspaces.length > 1) {
                return workspaces.filter((fsPath) => lastOpenFilePath.startsWith(fsPath))[0];
            }
        }
        return undefined;
    }

    /**
     * Manage comments
     */
    public openComments(artifact:ArtifactVersion){
        
    }

    /**
     * End of Contextual menu actions
     */
    
    // Get all tree Datas
    async getChildren(): Promise<ArtifactVersion[]> {
        // @Todo: Manage empty registry case. (Using the "default" group).
        if(!this.ActiveGroup.id){
            return [];
        }
        const children: ArtifactVersion[] = await this.getArtifactsVersions();
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(artifact: ArtifactVersion): vscode.TreeItem {
        // Manage display of group in the tree view.
        // Manage tree item
        const treeItem = new vscode.TreeItem(artifact.version, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.description = artifact.state;
        treeItem.command = {
            command: 'apicurioArtifactVersionsExplorer.selectArtifactVersion',
            title: 'Display artifact version',
            arguments: [artifact],
        };
        return treeItem;
    }
}


export class ApicurioArtifactVersionsExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioArtifactVersionsExplorerProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioArtifactVersionsExplorer', {
                treeDataProvider,
                showCollapseAll: true,
            })
        );
        // Register commands
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.refresh', (group: ActiveElement, artifact: ActiveElement) => treeDataProvider.refresh(group, artifact));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.selectArtifact', (artifact: Artifact, branch?: Branch) => treeDataProvider.selectArtifact(artifact, branch));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.selectArtifactVersion', (artifactVersion: ArtifactVersion) => treeDataProvider.selectArtifactVersion(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openVersion', (artifactVersion: ArtifactVersion) => treeDataProvider.openVersion(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openVersionReferences', (artifactVersion: ArtifactVersion) => treeDataProvider.openVersionReferences(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openComments', (artifactVersion: ArtifactVersion) => treeDataProvider.openComments(artifactVersion));
    }
}