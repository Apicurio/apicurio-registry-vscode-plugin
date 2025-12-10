'use strict';

import * as vscode from 'vscode';
import { Group, Branch } from '../interfaces';

class Settings {
    public hostname: string | null | undefined;
    public port: number | string | null | undefined;
    public path: string | null | undefined;
    public limit: number;
    public useHttps: boolean;

    constructor() {
        this.loadSettings();
        vscode.workspace.onDidChangeConfiguration(event => {
            vscode.window.showInformationMessage("CHANGE CONFIG");
             if (event.affectsConfiguration("apicurio")) {
                this.loadSettings();
             }
        });
        // vscode.commands.registerCommand('apicurioExplorer.refreshSettings', () => this.loadSettings());
        // vscode.commands.onDidExecuteCommand((event) => {
        //     if (event.command === 'apicurioExplorer.refresh') {
        //         this.loadSettings();
        //     }
        // });
    }

    private loadSettings() {
        const httpConfig = vscode.workspace.getConfiguration('apicurio.http');
        this.hostname = httpConfig.get('host');
        this.port = httpConfig.get('port');
        this.path = httpConfig.get('path');
        this.useHttps = httpConfig.get('secure');
        this.limit = vscode.workspace.getConfiguration('apicurio.search').get('limit');
    }

    public createAsDraft(): boolean {
        return vscode.workspace.getConfiguration('apicurio.create').get('asDraft');
    }

    public queryParamsPaginate(queryParams: object): object {
        return {
            ...queryParams,
            limit: this.limit,
            offset: 0,
        };
    }

    /**
     * Get preview from settings
     */
    public getPreview() {
        return vscode.workspace.getConfiguration('apicurio.tools.preview').get('OPENAPI');
    }

    /**
     * Get format from settings
     */
    public getFormat() {
        return vscode.workspace.getConfiguration('apicurio.tools.preview').get('format');
    }

    /**
     * Check if display name is set in settings.
     * @returns boolean
     */
    public displayName(): boolean {
        return vscode.workspace.getConfiguration('apicurio.explorer').get('name') ? true : false;
    }

    /**
     * Retrive Apicurio API version
     * @returns string
     */
    public getApicurioApiVersion(): string {
        return vscode.workspace.getConfiguration('apicurio.api').get('version');
    }

    /**
     * Manage Apicurio default values.
     */
    public getDefault(value: string) {
        let defaultValue: string;
        switch (value) {
            case 'group':
                defaultValue = 'default';
                break;
            case 'branch':
                defaultValue = 'latest';
                break;
            default:
                defaultValue = null;
                break;
        }
        return defaultValue;
    }

    public getDefaultGroup() {
        return { groupId: this.getDefault('group'), description: 'Default group, system generated.' } as Group;
    }
    public getDefaultBranch(artifactId?: string) {
        return { branchId: this.getDefault('branch'), artifactId: artifactId || "", groupId: this.getDefault('group'), description: 'Default branch, system generated.' } as Branch;
    }
    /**
     * End of Manage Apicurio default values.
     */
}

export { Settings };
