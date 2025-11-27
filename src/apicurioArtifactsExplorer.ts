'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, Artifact, ArtifactType } from './interfaces';
import { Services } from './tools/services';
import { Settings } from './tools/settings';
// import { path } from 'path';

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

    private ArtifactList: Promise<Artifact[]>;
    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };
    private ActiveArtifact: ActiveElement = { id: null, type: ElementType.ARTIFACT };
    private filterBy: any = null;
    private settings: Settings;

    constructor(extensionUri: vscode.Uri) {
        this.settings = new Settings();
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
        if (group) {
            this.ActiveGroup.id = group.id;
        }
        // Clear children and refresh view
        // this.GroupList = null;
        // vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveArtifact, true);
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get Artifacts
    private getArtifacts(): Promise<Artifact[]> {
        // Avoid API request if we already have the groups.
        if (this.ArtifactList) {
            return this.ArtifactList.then(res => res);
        }
        const result = Services.get().getRegistryClient().getArtifacts(this.ActiveGroup);
        const artifacts: Promise<Artifact[]> = result.then(res => {
            // Manage v2 retro-compatibility.
            let artifacts = res.artifacts;
            if (this.settings.getApicurioApiVersion() == "v2") {
                artifacts = Services.get().v2tov3Artifacts(artifacts);
            }
            return artifacts;
        });
        return artifacts;
    }

    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    public filter() {
        this.filterBy = (this.filterBy == null) ? "type" : null;
        this.onDidChangeTreeDataEmitter.fire();
    }
    // Filter artifacts by type.
    private filterArtifacts(artifacts): any {
        artifacts.sort((a, b) => {
            return a.artifactType.localeCompare(b.artifactType) || a.artifactId.localeCompare(b.artifactId);
            // modifiedOn
        });
        const grouped = Object.values(
            artifacts.reduce((acc, item) => {
                const key = item.artifactType;
                if (!acc[key]) acc[key] = { 'name': key, 'children': [] };
                acc[key]['children'].push(item); // keep full object
                return acc;
            }, {})
        );
        return grouped;
    }
    /**
     * Select a artifact from the explorer view
     * @param artifact The selected artifact
     */
    public selectArtifact(artifact: Artifact): void {
        // Refresh Group view to select current Group
        this.ActiveArtifact.id = artifact.artifactId;
        // @TODO display artifacts metas
        vscode.commands.executeCommand('apicurioBranchesExplorer.selectArtifact', artifact);
        vscode.commands.executeCommand('apicurioArtifactVersionsExplorer.selectArtifact', artifact);
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', this.ActiveArtifact, artifact);
        // this.refresh(); // No need of refreshing curent artifacts view.
    }

    /** Add Artifact */
    public async addArtifact(): Promise<void> {
        const artifactType = await vscode.window.showQuickPick(Object.values(ArtifactType), { placeHolder: 'Select the type of the new artifact:' });
        const artifactId = await vscode.window.showInputBox({ prompt: 'Enter the ID of the new artifact:' });
        const name = await vscode.window.showInputBox({ prompt: 'Enter a name for the new artifact (optional):' });
        const description = await vscode.window.showInputBox({ prompt: 'Enter a description for the new artifact (optional):' });
        if (artifactId) {
            try {
                await Services.get().getRegistryClient().createArtifact(this.ActiveGroup, artifactType, artifactId, name, description);
                vscode.window.showInformationMessage(`Artifact '${artifactId}' created successfully.`);
                this.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create artifact '${artifactId}': ${error.message}`);
            }
        } else {
            vscode.window.showWarningMessage('Artifact creation cancelled or missing properties.');
        }
    }

    // Add a new version
    public async addVersion(artifact: Artifact) {
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `Add a new version to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId }?` });
        if (confirm === 'Yes') {
            const version = await vscode.window.showInputBox({ prompt: 'Version for the new artifact version (optional, semver may be forced by the registry)' });
            if (confirm === 'Yes') {
                const previousProperties = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `Choose Yes to keep artifact level properties, no for update.` });
                if (previousProperties === 'Yes') {
                    // Keep previous properties
                } else {
                    const name = await vscode.window.showInputBox({ prompt: 'Edit name for the new artifact version (optional):', value: artifact.name });
                    const description = await vscode.window.showInputBox({ prompt: 'Edit description for the new artifact version (optional):', value: artifact.description });
                    artifact.name = name ? name : '';
                    artifact.description = description ? description : '';
                }
                // Choose file
                const fileUri = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Select Artifact File' });
                if (fileUri && fileUri[0]) {
                    const path = require('path');
                    const content = await vscode.workspace.fs.readFile(fileUri[0]);
                    Services.get().getRegistryClient().createArtifactVersion(version, artifact, path.extname(fileUri[0].fsPath),content).then(() => {
                        vscode.window.showInformationMessage(`New version added to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId }`);
                        this.selectArtifact(artifact);
                    }).catch((error) => {
                        console.error(error);
                        vscode.window.showErrorMessage(`Failed to add new version: ${error}`);
                    });
                }
            }
        }
    }

    /**
     * End of Contextual menu actions
     */

    // Get all tree Datas
    async getChildren(element?: Artifact): Promise<Artifact[]> {
        // If filtered child element.
        if (element) {
            return element.children;
        }
        // @TODO: Manage empty registry case. (Using the "default" group).
        if (!this.ActiveGroup.id) {
            return [];
        }
        let children: Artifact[] = await this.getArtifacts();
        if (this.filterBy) {
            children = this.filterArtifacts(children);
        }
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(artifact: Artifact): vscode.TreeItem {
        // IF filtered view, return filter
        if (artifact.artifactType == undefined) {
            const treeItem = new vscode.TreeItem(artifact.name, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.iconPath = {
                dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', artifact.name.toLowerCase() + '.svg'),
                light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', artifact.name.toLowerCase() + '.svg'),
            };
            return treeItem;
        }
        // Manage default Group as not in artifact property when default.
        if (!artifact.groupId) {
            artifact.groupId = this.settings.getDefaultGroup().groupId;
        }
        // Manage display of artifacts in the tree view.
        const displayName = this.settings.displayName();
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
        vscode.commands.registerCommand('apicurioArtifactsExplorer.filter', () => treeDataProvider.filter());
        vscode.commands.registerCommand('apicurioArtifactsExplorer.selectArtifact', (artifact: Artifact) => treeDataProvider.selectArtifact(artifact));
        vscode.commands.registerCommand('apicurioArtifactsExplorer.addArtifact', () => treeDataProvider.addArtifact());
        vscode.commands.registerCommand('apicurioArtifactsExplorer.addVersion', (artifact: Artifact) => treeDataProvider.addVersion(artifact));
    }
}