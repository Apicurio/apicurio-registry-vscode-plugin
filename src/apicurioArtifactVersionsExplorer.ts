'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, ArtifactVersionsList, ArtifactVersion, BranchList, Branch, Artifact } from './interfaces';
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
 *  - Contextual menu on artifactVersionss artifactVersions and Branches
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
    }
}