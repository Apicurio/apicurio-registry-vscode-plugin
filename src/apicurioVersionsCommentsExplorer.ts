'use strict';

import * as vscode from 'vscode';
import { VersionEntry, VersionCommentsEntry, CurrentArtifact } from './interfaces';
import { version } from 'os';
import { ApicurioTools } from './tools';

namespace _ {
    export const tools = new ApicurioTools();
}

/**
 * Apicurio Versions Comments Explorer Provider
 */

export class ApicurioVersionsCommentsProvider implements vscode.TreeDataProvider<VersionCommentsEntry> {

    private _currentArtifact: CurrentArtifact;
    protected get currentArtifact(): CurrentArtifact {
        return this._currentArtifact;
    }
    protected set currentArtifact(value: CurrentArtifact) {
        this._currentArtifact = value;
    }
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    constructor() {
        this._currentArtifact = {
            group: undefined,
            artifactId: undefined,
            version: undefined,
        };
    }

    // async refresh(): Promise<any> {
    //     this._onDidChangeTreeData.fire(undefined);
    // }
    // async refreshEntry(element: SearchEntry | VersionEntry): Promise<any> {
    //     this.changeCurrentArtifact(element);
    //     this.refresh();
    // }

    // tree data provider

    async getChildren(element?: CurrentArtifact | VersionEntry | VersionCommentsEntry) : Promise<VersionCommentsEntry[]> {
        // Retrive Active artifact version comments.
        let artifact: CurrentArtifact = this.currentArtifact;
        if (this.currentArtifact.group) {
            artifact = {
                group: this.currentArtifact.group,
                artifactId: this.currentArtifact.artifactId,
                version: this.currentArtifact.version ? this.currentArtifact.version : 'latest',
            };
        }
        if (artifact.group) {
            const children: string[] = await this.readComments(artifact);
            let entries: any[] = [];
            if (Array.isArray(children)) {
                entries = children;
            }
            return Promise.resolve(entries);
        }
        return Promise.resolve([]);
    }

    getTreeItem(element: VersionCommentsEntry): vscode.TreeItem {
        let treeItem: vscode.TreeItem = {};
        let description = ' (by ' + element.owner + ' on ' + element.createdOn + ')';
        treeItem = new vscode.TreeItem(element.commentId, vscode.TreeItemCollapsibleState.None); // None / Collapsed
        treeItem.description = description;
        treeItem.tooltip = description;
        treeItem.command = {
            command: 'apicurioVersionsCommentsExplorer.displayComment',
            title: 'Display comment value',
            arguments: [this.currentArtifact, element],
        };
        return treeItem;
    }

    readComments(artifact: CurrentArtifact): string[] | Thenable<string[]> {
        return this._readComments(artifact);
    }
    async _readComments(artifact): Promise<string[]> {
        const path = _.tools.getQueryPath(artifact as CurrentArtifact, 'versionComments');
        const children: any = await _.tools.query(path);
        return Promise.resolve(children as string[]);

    }

    displayComment(element:CurrentArtifact, value: VersionCommentsEntry) {
        /**
         *  Display in a webview Panel vs alert vs sidebar webview vs panel view ?
         *  May a webview in panel ?
         *  Could be used to edit the comment in the future ?
         */
        // let message = element.group + '/' + element.artifactId + '/' + element.version + ' \n Comment value: ' + value;
        // vscode.window.showInformationMessage(message);
        vscode.window.createWebviewPanel(
            'apicurioVersionsCommentsExplorer.displayComment',
            'Display Comment', 
            vscode.ViewColumn.One,
            { enableScripts: true }
        ).webview.html = `<html><body><h2>Comment for ${element.group}/${element.artifactId}/${element.version}</h2><p>${value.value.replace('\n', '<br>')}</p><p><i>by ${value.owner} on ${value.createdOn}</i></p></body></html>`;
    }

    async refresh(): Promise<any> {
        this._onDidChangeTreeData.fire(undefined);
    }
    async refreshEntry(element: CurrentArtifact): Promise<any> {
        this.changeCurrentArtifact(element);
        this.refresh();
    }
    private changeCurrentArtifact(element: CurrentArtifact) {
        this.currentArtifact = {
            group: element.group,
            artifactId: element.artifactId,
            version: element.version ? element.version : 'latest',
        };
    }
}

export class ApicurioVersionsCommentsExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioVersionsCommentsProvider();
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioVersionsCommentsExplorer', {
                treeDataProvider,
            })
        );
        vscode.commands.registerCommand('apicurioVersionsCommentsExplorer.refresh', () => treeDataProvider.refresh());
        vscode.commands.registerCommand('apicurioVersionsCommentsExplorer.getChildren', (element: CurrentArtifact) =>
            treeDataProvider.refreshEntry(element)
        );
        vscode.commands.registerCommand('apicurioVersionsCommentsExplorer.displayComment', (element:CurrentArtifact, value: VersionCommentsEntry) => treeDataProvider.displayComment(element, value));
    };
}