'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, Artifact } from './interfaces';
import { ApicurioTools } from './tools';
import { Services } from './services';

namespace _ {
    export const tools = new ApicurioTools();
}

/**
 * Apicurio Explorer Provider
 */

/**
 * Tree data provider for Apicurio Artifact Explorer view
 * 
 * This view retrive groups and manage callbacks for :
 *  - Display Group Branches and artifacts in the apropriate view
 *  - Contextual menu on group
 *  - Display group metas and configs in apropriate view
 * 
 */

export class ApicurioArtifactsExplorerProvider implements vscode.TreeDataProvider<Group> {
    private readonly extensionUri: any;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };
    private ActiveArtifact: ActiveElement = { id: null, type: ElementType.ARTIFACT };

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
    public refresh(group?: ActiveElement): any {
        if(group){
            this.ActiveGroup.id = group.id;
        }
        // Clear children and refresh view
        // vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveArtifact, true);
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get Artifacts
    private getArtifacts(): Promise<Artifact[]> {
        let result = Services.get().getRegistryClient().getArtifacts(this.ActiveGroup);
        let artifacts: Promise<Artifact[]> = result.then(res => res.artifacts);
        return artifacts;
    }

    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    /**
     * Select a artifact from the explorer view
     * @param artifact The selected group
     */
    public selectArtifact(artifact: Artifact): void {
        // Refresh Group view to select current Group
        this.ActiveArtifact.id = artifact.artifactId;
        // @TODO: display artifacts metas
        vscode.commands.executeCommand('apicurioBranchesExplorer.selectArtifact', artifact);
        vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.selectArtifact', artifact);
        this.refresh();
    }

    /**
     * End of Contextual menu actions
     */
    
    // Get all tree Datas
    async getChildren(): Promise<Artifact[]> {
        // @Todo: Manage empty registry case. (Using the "default" group).
        if(!this.ActiveGroup.id){
            return [];
        }
        const children: Artifact[] = await this.getArtifacts();
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(artifact: Artifact): vscode.TreeItem {
        // Manage display of group in the tree view.
        const displayName = _.tools.displayName();
        const name = (!displayName || !artifact.name) ? artifact.artifactId : artifact.name;
        const tooltip = (!displayName && artifact.name) ? artifact.name : artifact.artifactId;
        // Manage tree item
        const treeItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.tooltip = tooltip;
        treeItem.iconPath = {
            dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', artifact.artifactType.toLowerCase() + '.svg'),
            light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', artifact.artifactType.toLowerCase() + '.svg'),
        };
        treeItem.command = {
            command: 'apicurioArtifactsExplorer.selectArtifact',
            title: 'Display artifact datas',
            arguments: [artifact],
        };
        return treeItem;
    }
}


export class ApicurioArtifactsExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioArtifactsExplorerProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioArtifactsExplorer', {
                treeDataProvider,
                showCollapseAll: true,
            })
        );
        // Register commands
        vscode.commands.registerCommand('apicurioArtifactsExplorer.refresh', (group: ActiveElement) => treeDataProvider.refresh(group));
        vscode.commands.registerCommand('apicurioArtifactsExplorer.selectArtifact', (artifact: Artifact) => treeDataProvider.selectArtifact(artifact));
    }
}