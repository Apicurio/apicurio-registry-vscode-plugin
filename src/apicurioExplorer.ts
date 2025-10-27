'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType } from './interfaces';
import { ApicurioTools } from './tools';
import { Services } from './services';

namespace _ {
    export const tools = new ApicurioTools();
}

/**
 * Apicurio Explorer Provider
 */

/**
 * Tree data provider for Apicurio Explorer view
 * 
 * This view retrive groups and manage callbacks for :
 *  - Display Group Branches and artifacts in the apropriate view
 *  - Contextual menu on group
 *  - Display group metas and configs in apropriate view
 * 
 * - @TODO : Manage default group (if no exist, artifact in fefault are not accessible...)
 * 
 */

export class ApicurioExplorerProvider implements vscode.TreeDataProvider<Group> {
    private readonly extensionUri: any;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private GroupList: Promise<Group[]>;
    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };

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
    public refresh(keepCache?: boolean): any {
        // Clear cached groups to force re-fetching from the server.
        if(!keepCache){
            this.GroupList = null;
            // Clear children and refresh view
            vscode.commands.executeCommand('apicurioArtifactsExplorer.refresh', this.ActiveGroup);
            vscode.commands.executeCommand('apicurioBranchesExplorer.refresh', this.ActiveGroup, true);
            vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.refresh', {groupId:null}, null);
        }
        vscode.commands.executeCommand('apicurioBranchesExplorer.refresh', {id:null, type:null} as ActiveElement, true);
        vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.refresh', {groupId:null}, null);
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveGroup, true);
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get Groups
    private getGroups(): Promise<Group[]> {
        // Avoid API request if we already have the groups.
        if (this.GroupList){
            return this.GroupList.then(res => res);
        }
        let result = Services.get().getRegistryClient().getGroups();
        let groups: Promise<Group[]> = result.then(res => res.groups);
        this.GroupList = groups; // Cache result to avoid future requests.
        return groups;
    }


    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    /**
     * Select a group from the explorer view
     * @param group The selected group
     */
    public selectGroup(group: Group): void {
        // Refresh Group view to select current Group
        this.ActiveGroup.id = group.groupId;
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveGroup);
        vscode.commands.executeCommand('apicurioArtifactsExplorer.refresh', this.ActiveGroup);
        this.refresh(true);
    }

    /**
     * End of Contextual menu actions
     */
    
    // Get all tree Datas
    async getChildren(group?: Group): Promise<Group[]> {
        const children = await this.getGroups();
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(group: Group): vscode.TreeItem {
        // Manage display of group in the tree view.
        const displayName = _.tools.displayName();
        const name = (!displayName || !group.name) ? group.groupId : group.name;
        const tooltip = (!displayName && group.name) ? group.name : group.groupId;
        // Manage tree item
        const treeItem = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.tooltip = tooltip;
        treeItem.iconPath = new vscode.ThemeIcon((this.ActiveGroup.id === group.groupId) ? 'folder-opened' : 'folder');
        treeItem.command = {
            command: 'apicurioExplorer.selectGroup',
            title: 'Display artifact versions',
            arguments: [group],
        };
        return treeItem;
    }
}


export class ApicurioExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioExplorerProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioExplorer', {
                treeDataProvider,
                showCollapseAll: true,
            })
        );
        // Register commands
        vscode.commands.registerCommand('apicurioExplorer.refresh', () => treeDataProvider.refresh());
        vscode.commands.registerCommand('apicurioExplorer.selectGroup', (group: Group) => treeDataProvider.selectGroup(group));
    }
}