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
        // As api do not return full Barnch object, complement it here
        artifactVersion.artifactId = this.ActiveArtifact.id;
        artifactVersion.groupId = this.ActiveGroup.id;
        vscode.commands.executeCommand('apicurioMetasExplorer.refresh', {id:artifactVersion.artifactId, type:ElementType.VERSION} as ActiveElement, artifactVersion);
    }

    /**
     * Open an artifact Version
     */
    public openVersionReferences(artifact:ArtifactVersion){
        this.openVersion(artifact, ReferencesQueryParam.REWRITE);
    }
    public async openVersion(artifact:ArtifactVersion, references?:ReferencesQueryParam): Promise<void> {
        // Request the content and include response headers for accurate detection
        // @TODO test all artifacts types in the registry.
        const result = await Services.get().getRegistryClient().getArtifactContent(artifact, references, undefined, true);

        let artifactContent: any = result;
        let responseHeaders: any = {};
        if (result && result._response) {
            artifactContent = result._response._body;
            responseHeaders = result._response._headers || {};
        }

        // Detect file extension and language from response headers or artifact type
        let contentType = responseHeaders['content-type'] || responseHeaders['Content-Type'] || '';
        let extention = '';
        if (contentType.includes('yaml') || contentType.includes('yml') || artifact.artifactType === 'OPENAPI') {
            extention = 'yaml';
        } else if (contentType.includes('json')) {
            extention = 'json';
        } else if (artifact.artifactType) {
            // Fallback based on artifact type
            extention = artifact.artifactType.toLowerCase();
        }

        // Manage document
        const wsDirPath = this.getWorkspaceDirPath();
        let fileName: string = `${artifact.groupId}--${artifact.artifactId}--${artifact.version}${extention ? `.${extention}` : ''}`;
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
            if (_.tools.getFormat()) {
                // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger command...
                setTimeout(() => {vscode.commands.executeCommand('editor.action.formatDocument');}, 500);
            }
            // Preview if available
            if (_.tools.getPreview() && vscode.extensions.getExtension('Arjun.swagger-viewer')) {
                if (artifact.artifactType == 'OPENAPI') {
                    // @FIXME : Quick & dirty timeout to manage delai to insert content befor triger command...
                    setTimeout(() => {vscode.commands.executeCommand('swagger.preview');}, 500);
                }
            }
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`Failed to open artifact content: ${error}`);
            return;
        }
        return;
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
        // Ensure we await the comments promise before trying to display them
        this.getComments(artifact).then((comments) => this.displayComment(artifact, comments));
    }
    public getComments(artifact:ArtifactVersion): Promise<any[]>{
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
        if(comments.length){
            for (let i in comments) {
                content.push(`<h2>${comments[i].commentId}</h2><p>${comments[i].value.replace('\n', '<br>')}</p><p><i>by ${comments[i].owner} on ${comments[i].createdOn}</i></p>`)
            }
        }
        else{
            content = ["<p>No comments.</p>"];
        }
        vscode.window.createWebviewPanel(
            'apicurioArtifactVersionsExplorer.displayComment',
            'Display Comment', 
            vscode.ViewColumn.One,
            { enableScripts: true }
        ).webview.html = `<html><body><h1>Comments for ${artifact.groupId} > ${artifact.artifactId} > ${artifact.version}</h1>${content.toString()}</body></html>`;
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