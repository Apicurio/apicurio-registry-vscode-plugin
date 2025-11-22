'use strict';

import * as vscode from 'vscode';
import { Group, ActiveElement, ElementType, ArtifactType, ArtifactVersion, BranchList, Branch, Artifact, ReferencesQueryParam } from './interfaces';
import { Services } from './tools/services';
import { Settings } from './tools/settings';

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
    private settings: Settings;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private ActiveGroup: ActiveElement = { id: null, type: ElementType.GROUP };
    private ActiveArtifact: ActiveElement = { id: null, type: ElementType.ARTIFACT };
    private ActiveBranch: ActiveElement = { id: null, type: ElementType.BRANCH };
    private filterBy: any = null;

    constructor(extensionUri: vscode.Uri) {
        this.settings = new Settings();
        this.extensionUri = extensionUri;
        this.ActiveBranch.id = this.settings.getDefault('branch');
        // Manage events for window refresh.
        this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<any>();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    }

    /**
     * General management of the view
     */

    // Refresh the view
    public refresh(group?: ActiveElement, artifact?: ActiveElement, branch?: ActiveElement): any {
        if (group) {
            this.ActiveGroup.id = group.id;
        }
        if (artifact) {
            this.ActiveArtifact.id = artifact.id;
        }
        if (branch) {
            this.ActiveBranch.id = (branch.id) ? branch.id : this.settings.getDefault('branch');
        }
        else if (!this.ActiveBranch.id) {
            this.ActiveBranch.id = this.settings.getDefault('branch');
        }
        this.onDidChangeTreeDataEmitter.fire();
    }

    // Get ArtifactVersions
    private getArtifactsVersions(): Promise<ArtifactVersion[]> {
        const result = Services.get().getRegistryClient().getArtifacttVersions(this.ActiveGroup, this.ActiveArtifact, this.ActiveBranch);
        const artifacts: Promise<ArtifactVersion[]> = result.then(res => {
            // Manage v2 retro-compatibility.
            let versions = res.versions;
            if (this.settings.getApicurioApiVersion() == "v2") {
                versions = Services.get().v2tov3Versions(versions, this.ActiveGroup.id, this.ActiveArtifact.id);
            }
            return versions;
        });
        return artifacts;
    }

    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    /**
     * Filter artifactsVersions
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
                const key = item.state;
                if (!acc[key]) acc[key] = { 'name': key, 'children': [] };
                acc[key]['children'].push(item); // keep full object
                return acc;
            }, {})
        );
        return grouped;
    }

    /**
     * Select a artifactVersions from the explorer view
     * @param artifact The selected group
     */
    public selectArtifact(artifact: Artifact, branch?: Branch): void {
        this.ActiveArtifact.id = artifact.artifactId;
        this.ActiveGroup.id = artifact.groupId;
        this.ActiveBranch.id = this.settings.getDefault('branch');
        if (branch) {
            this.ActiveBranch.id = branch.branchId;
        }
        this.refresh();
    }

    public selectArtifactVersion(artifactVersion: ArtifactVersion): void {
        // As api do not return full Barnch object, complement it here
        artifactVersion.artifactId = this.ActiveArtifact.id;
        artifactVersion.groupId = this.ActiveGroup.id;
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', { id: artifactVersion.artifactId, type: ElementType.VERSION } as ActiveElement, artifactVersion);
    }

    /**
     * Open an artifact Version
     */
    public openVersionReferences(artifact: ArtifactVersion) {
        this.openVersion(artifact, ReferencesQueryParam.DEREFERENCE);
    }

    public async openVersion(artifact: ArtifactVersion, references?: ReferencesQueryParam): Promise<void> {
        // Request the content and include response headers for accurate detection
        // @TODO test all artifacts types in the registry.
        // Manage default group issue.
        // If groupId undefined, add default group.
        if (!artifact.groupId) {
            artifact.groupId = this.settings.getDefault('group');
        }
        const result = await Services.get().getRegistryClient().getArtifactContent(artifact, references, undefined, true);

        let artifactContent: any = result;
        let responseHeaders: any = {};
        if (result && result._response) {
            artifactContent = result._response._body;
            responseHeaders = result._response._headers || {};
        }

        // Detect file extension and language from response headers or artifact type
        const contentType = responseHeaders['content-type'] || responseHeaders['Content-Type'] || '';
        let extention = '';
        if (contentType.includes('yaml') || contentType.includes('yml')) {
            extention = 'yaml';
        } else if (contentType.includes('avro') || artifact.artifactType === ArtifactType.AVRO) {
            extention = 'avsc';
        } else if (contentType.includes('json')) {
            extention = 'json';
        } else if (artifact.artifactType) {
            // Fallback based on artifact type
            extention = artifact.artifactType.toLowerCase();
        } else {
            // Fallback
            extention = 'txt';
        }

        // Manage document
        const wsDirPath = this.getWorkspaceDirPath();
        let fileName: string = `${artifact.groupId}--${artifact.artifactId}--${artifact.version}${extention ? `.${extention}` : 'txt'}`;
        if (wsDirPath != undefined) {
            fileName = `${wsDirPath}/${fileName}`;
        } else {
            vscode.window.showWarningMessage(`Could not determine full workspace path for file '${fileName}'.`);
        }
        const newUri = vscode.Uri.file(fileName).with({ scheme: 'untitled', path: fileName });
        // Choose representation: if the content is already a string use it, otherwise stringify nicely
        const contentToInsert = typeof artifactContent === 'string' ? artifactContent : JSON.stringify(artifactContent, null, 2);

        try {
            const doc = await vscode.workspace.openTextDocument(newUri);
            const editor = await vscode.window.showTextDocument(doc, 1, false);
            // Replace entire document content if it already exists, otherwise insert.
            const currentText = doc.getText();
            const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(currentText.length));
            await editor.edit((edit) => {
                edit.replace(fullRange, contentToInsert);
            });
            // Attempt to set language based on detected type
            try {
                const lang = extention === 'yaml' ? 'yaml' : extention === 'json' ? 'json' : undefined;
                if (lang) {
                    await vscode.languages.setTextDocumentLanguage(doc, lang);
                }
            } catch (e) {
                // Non-fatal
            }

            // Format document if enabled
            if (this.settings.getFormat()) {
                // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger command...
                setTimeout(() => { vscode.commands.executeCommand('editor.action.formatDocument'); }, 500);
            }
            // Preview if available
            if (this.settings.getPreview() && vscode.extensions.getExtension('Arjun.swagger-viewer')) {
                if (artifact.artifactType == 'OPENAPI') {
                    // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger command...
                    setTimeout(() => { vscode.commands.executeCommand('swagger.preview'); }, 500);
                }
            }
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`Failed to open artifact content: ${error}`);
            return;
        }
        return;
    }

    getWorkspaceDirPath(): string | undefined {
        const lastOpenFilePath: string | undefined = vscode.window.activeTextEditor?.document.fileName;
        const workspaces = vscode.workspace.workspaceFolders?.map((dir) => dir.uri.fsPath);
        if (workspaces !== undefined) {
            if (workspaces.length === 1) {
                return workspaces[0];
            }
            if (lastOpenFilePath !== undefined && workspaces.length > 1) {
                const filtered = workspaces.filter((fsPath) => lastOpenFilePath.startsWith(fsPath));
                if (filtered.length > 0) {
                    return filtered[0];
                }
            }
            // Fallback to the first workspace if we can't determine the correct one
            if (workspaces.length > 0) {
                return workspaces[0];
            }
        }
        return undefined;
    }

    /**
     * Manage comments
     */
    public openComments(artifact: ArtifactVersion) {
        // Ensure we await the comments promise before trying to display them
        this.getComments(artifact).then((comments) => this.displayComment(artifact, comments));
    }
    public getComments(artifact: ArtifactVersion): Promise<any[]> {
        // getArtifactComment returns a Promise; return it directly and log the resolved value
        const commentsPromise = Services.get().getRegistryClient().getArtifactComment(artifact);
        return commentsPromise.then(res => res);
    }
    public displayComment(artifact, comments) {
        // /**
        //  *  Display in a webview Panel vs alert vs sidebar webview vs panel view ?
        //  *  May a webview in panel ?
        //  *  Could be used to edit the comment in the future ?
        //  */
        let content = [];
        if (comments.length) {
            for (const i in comments) {
                content.push(`<h2>${comments[i].commentId}</h2><p>${comments[i].value.replace('\n', '<br>')}</p><p><i>by ${comments[i].owner} on ${comments[i].createdOn}</i></p>`);
            }
        }
        else {
            content = ["<p>No comments.</p>"];
        }
        vscode.window.createWebviewPanel(
            'apicurioArtifactVersionsExplorer.displayComment',
            'Display Comment',
            vscode.ViewColumn.One,
            { enableScripts: true }
        ).webview.html = `<html><body><h1>Comments for ${artifact.groupId} > ${artifact.artifactId} > ${artifact.version}</h1>${content.toString()}</body></html>`;
    }

    // Add comments.
    public async addComment(artifact: ArtifactVersion) {
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `Add a comment to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId } version ${artifact.version}?` });
        if (confirm === 'Yes') {
            // const comment = await vscode.window.showInputBox({ prompt: `Enter a comment to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId } version ${artifact.version}.` });
            const comment = await vscode.window.showInputBox({ prompt: `Enter a comment to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId } version ${artifact.version}.` });
            if (comment) {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `Confirm comment: ${comment}` });
                if (confirm === 'Yes') {
                    Services.get().getRegistryClient().addArtifactComment(artifact, comment).then(() => {
                        vscode.window.showInformationMessage(`Comment added to ${(this.settings.displayName() && artifact.name)? artifact.name : artifact.artifactId } version ${artifact.version}`);
                    }).catch((error) => {
                        console.error(error);
                        vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
                    });
                }
            }
        }
    }

    /**
     * End of Contextual menu actions
     */

    // Get all tree Datas
    async getChildren(element?: ArtifactVersion): Promise<ArtifactVersion[]> {
        // If filtered child element.
        if (element) {
            return element.children;
        }
        // @Todo: Manage empty registry case. (Using the "default" group).
        if (!this.ActiveGroup.id) {
            return [];
        }
        let children: ArtifactVersion[] = await this.getArtifactsVersions();
        if (this.filterBy) {
            children = this.filterArtifacts(children);
        }
        // vscode.window.showErrorMessage(`version: ${JSON.stringify(children)}`);
        return Promise.resolve(children);
    }

    // Get each tree items.
    getTreeItem(artifact: ArtifactVersion): vscode.TreeItem {
        // IF filtered view, return filter
        if (artifact.artifactType == undefined) {
            const treeItem = new vscode.TreeItem(artifact.name, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.contextValue = 'collapsibleItem';
            return treeItem;
        }
        // Manage display of group in the tree view.
        // Manage tree item
        const treeItem = new vscode.TreeItem(artifact.version, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.description = artifact.state;
        // treeItem.tooltip = new vscode.MarkdownString(`**${artifact.version}**`);
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
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.filter', () => treeDataProvider.filter());
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.selectArtifact', (artifact: Artifact, branch?: Branch) => treeDataProvider.selectArtifact(artifact, branch));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.selectArtifactVersion', (artifactVersion: ArtifactVersion) => treeDataProvider.selectArtifactVersion(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openVersion', (artifactVersion: ArtifactVersion) => treeDataProvider.openVersion(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openVersionReferences', (artifactVersion: ArtifactVersion) => treeDataProvider.openVersionReferences(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.openComments', (artifactVersion: ArtifactVersion) => treeDataProvider.openComments(artifactVersion));
        vscode.commands.registerCommand('apicurioArtifactVersionsExplorer.addComment', (artifactVersion: ArtifactVersion) => treeDataProvider.addComment(artifactVersion));
    }
}