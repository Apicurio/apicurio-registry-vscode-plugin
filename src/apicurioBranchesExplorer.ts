'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, Branch, Artifact } from './interfaces';
import { Services } from './tools/services';
import { Settings } from './tools/settings';

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

export class ApicurioBranchesExplorerProvider implements vscode.TreeDataProvider<Group> {
    private readonly extensionUri: any;
    private settings: Settings;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };
    private ActiveArtifact: ActiveElement = { id: null, type: ElementType.ARTIFACT };

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.settings = new Settings();
        // Manage events for window refresh.
        this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<any>();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    }

    /**
     * General management of the view
     */

    // Refresh the view
    public refresh(group?: ActiveElement): any {
        if (group) {
            this.ActiveGroup.id = group.id;
        }
        // vscode.window.showInformationMessage(`Refresh ${JSON.stringify(this.ActiveGroup)}`);
        // Clear children and refresh view
        // vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveArtifact, true);
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get Artifacts
    private getBranches(): Promise<Branch[]> {
        const result = Services.get().getRegistryClient().getBranches(this.ActiveGroup, this.ActiveArtifact);
        const branches: Promise<Branch[]> = result.then(res => res.branches);
        return branches;
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
        this.ActiveGroup.id = artifact.groupId;
        this.refresh();
    }
    /**
     * Select a Branch from the explorer view
     * @param branch The selected branch
     */
    public selectBranch(branch: Branch): void {
        // As api do not return full Barnch object, compement it here
        branch.artifactId = this.ActiveArtifact.id;
        branch.groupId = this.ActiveGroup.id;
        vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.selectArtifact', { groupId: this.ActiveGroup.id, artifactId: this.ActiveArtifact.id } as Artifact, branch);
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', { id: branch.branchId, type: ElementType.BRANCH } as ActiveElement, branch);
    }

    /**
     * End of Contextual menu actions
     */

    // Get all tree Datas
    async getChildren(): Promise<Branch[]> {
        if (this.settings.getApicurioApiVersion() === 'v2') {
            return [this.settings.getDefaultBranch(this.ActiveArtifact.id)] as Branch[];
        }
        if (!this.ActiveGroup.id) {
            return [];
        }
        const children: Branch[] = await this.getBranches();
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(branch: Branch): vscode.TreeItem {
        // Manage display of group in the tree view.
        const treeItem = new vscode.TreeItem(branch.branchId, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.iconPath = new vscode.ThemeIcon('git-branch');
        if (this.settings.getApicurioApiVersion() != 'v2') {
            treeItem.command = {
                command: 'apicurioBranchesExplorer.selectBranch',
                title: 'Display artifact branch',
                arguments: [branch],
            };
        }
        return treeItem;
    }
}


export class ApicurioBranchesExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioBranchesExplorerProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioBranchesExplorer', {
                treeDataProvider,
                showCollapseAll: true,
            })
        );
        // Register commands
        vscode.commands.registerCommand('apicurioBranchesExplorer.refresh', (group: ActiveElement) => treeDataProvider.refresh(group));
        vscode.commands.registerCommand('apicurioBranchesExplorer.selectArtifact', (artifact: Artifact) => treeDataProvider.selectArtifact(artifact));
        vscode.commands.registerCommand('apicurioBranchesExplorer.selectBranch', (branch: Branch) => treeDataProvider.selectBranch(branch));
    }
}