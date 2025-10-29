'use strict';

import * as vscode from 'vscode';
import { Meta, ActiveElement, ElementType, Group, Artifact, ArtifactVersion } from './interfaces';
import { ApicurioTools } from './tools';
import { Services } from './services';

namespace _ {
    export const tools = new ApicurioTools();
}

/**
 * Apicurio Metas Explorer Provider
 */

/**
 * Tree data provider for Apicurio Meta Explorer view
 * 
 * This view retrive metas and manage callbacks for :
 *  - Display Meta Branches and artifacts in the apropriate view
 *  - Contextual menu on meta
 *  - Display meta metas and configs in apropriate view
 * 
 */

export class ApicurioMetasExplorerProvider implements vscode.TreeDataProvider<Meta> {
    private readonly extensionUri: any;

    private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void>;
    readonly onDidChangeTreeData: vscode.Event<void>;

    private ActiveElement: ActiveElement = { id: null, type: null };
    private ActiveDataObject: Artifact|ArtifactVersion;

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
    public refresh(element: ActiveElement, data?:Artifact, clear?: boolean): any {
        this.ActiveElement = { id: element.id, type: element.type };
        if(data){ this.ActiveDataObject = data; }
        if (clear) {
            this.ActiveElement = { id: null, type: null };
            this.ActiveDataObject = null;
        }
        this.onDidChangeTreeDataEmitter.fire();
        return;
    }
    // Get Metas
    private async getMetas(element: ActiveElement, data?: Group|Artifact|ArtifactVersion): Promise<Meta[]> {
        // If no element or invalid element provided, fallback to default group
        if (!element || !element.id) {
            // Use default group id expected by the registry client
            element = { id: 'default', type: ElementType.GROUP } as ActiveElement;
        }
        try {
            let result = [];
            let metas = [];
            // Fetch metas for the active element and await the promise
            switch (this.ActiveElement.type) {
                case ElementType.GROUP:
                    result = await Services.get().getRegistryClient().getMetas(element);
                    metas.push(...this.queryResultToMetas(result));
                    // Fetch Group rules for the active group and await the promise
                    result = await Services.get().getRegistryClient().getGroupRules(element);
                    if(result.length != 0){
                        let rulesConfigs = [];
                        for(let i in result){
                            let rulesResult = await Services.get().getRegistryClient().getGroupRulesConfig(element, result[i]);
                            rulesConfigs.push(rulesResult);
                        }
                        let rules = {'Rules':this.queryResultToMetas(rulesConfigs, true)};
                        // @TODO Get rules for all available entities.
                        metas.push(rules);
                    }
                    break;
                case ElementType.ARTIFACT:
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    // Fetch Group rules for the active artifact and await the promise
                    result = await Services.get().getRegistryClient().getArtifactRules(this.ActiveDataObject);
                    if(result){
                        let rulesConfigs = [];
                        for(let i in result){
                            let rulesResult = await Services.get().getRegistryClient().getArtifactRulesConfig(this.ActiveDataObject, result[i]);
                            rulesConfigs.push(rulesResult);
                        }
                        if(rulesConfigs.length){
                            let rules = {'Rules':this.queryResultToMetas(rulesConfigs, true)};
                            // @TODO Get rules for all available entities.
                            metas.push(rules);
                        }
                    break
                case ElementType.VERSION:
                    // @TODO Get references
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    // Fetch References rules for the active artifact Version and await the promise
                    // @TODO Manage the display.
                    result = await Services.get().getRegistryClient().getArtifactrReferences(this.ActiveDataObject);
                    if(result.length){
                        let refs:any[] = [];
                        for(let i in result){
                            refs[i]={};
                            refs[i][result[i].name]= result[i];
                        }
                        let references = {'References':refs};
                        metas.push(references);
                    }
                    break;
                default:
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    break;
            }
            return metas;
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error fetching metas: ${err}`);
            return [];
        }
    }

    private queryResultToMetas(result, rules?: boolean){
        // @Todo: Manage proper display of Rules.
        // @Todo: request for rules settigns and display it.
        const metas: Meta[] = [];
        const children: Meta[] = [];
        // Rules managment
        if(rules){
            for (let i in result) {
                metas.push({ [`${result[i].ruleType}`]: `${result[i].config}` } as Meta);
            }
        }
        // Others metas managment
        else{
            for (let i in result) {
                // As the object key is dynamic, extract it here.
                if (typeof result[i] === 'object' && result[i] !== null) {
                    children.length = 0; // Clear children array
                    for (const key of Object.keys(result[i])) {
                        children.push({ [key]: result[i][key] } as Meta);
                    }
                    metas.push({ [i]: children } as Meta);
                } else {
                    metas.push({ [i]: result[i] } as Meta);
                }
            }
        }
        return metas;
    }

    /**
     * End of general management of the view
     */

    /**
     * Contextual menu actions
     */

    /**
     * Display Metas Values in a Text Document for clarity.
     */
    public displayMetasValue() {
        this.getMetas(this.ActiveElement).then(metas => {
            let value: string = '';
            for (const meta of metas) {
                const key = Object.keys(meta)[0];
                const val = (meta as any)[key];

                // If the value is an array, iterate children (each child is a { key: value } Meta)
                if (Array.isArray(val)) {
                    value += `\n## ${key}\n`;
                    for (const child of val) {
                        const childKey = Object.keys(child)[0];
                        value += `\n### ${childKey}\n\n${child[childKey]}\n`;
                    }
                } else if (val && typeof val === 'object') {
                    // If it's an object (map), list its properties
                    value += `\n## ${key}\n`;
                    for (const prop of Object.keys(val)) {
                        value += `\n### ${prop}\n\n${val[prop]}\n`;
                    }
                } else {
                    // Primitive value
                    value += `\n## ${key}\n\n${val}\n`;
                }
            }
            vscode.workspace.openTextDocument({
                content: `# ${this.ActiveElement.type}: ${this.ActiveElement.id}\n\n${value}`,
                language: 'markdown'
            }).then(doc => {
                vscode.window.showTextDocument(doc, { preview: false });
            });
        });
    }

    /**
     * End of Contextual menu actions
     */
    
    // Get all tree Datas
    // NOTE: when `element` is undefined, VS Code asks for root items; when `element` is a Meta,
    // VS Code asks for the children of that Meta node.
    async getChildren(element?: Meta, data?:Group|Artifact|ArtifactVersion): Promise<Meta[]> {
        // Root request: fetch metas for the active group
        if (!element) {
            if (!this.ActiveElement || this.ActiveElement.id == null) {
                return [];
            }
            return await this.getMetas(this.ActiveElement, data);
        }

        // Child request: element is a Meta object with a single dynamic key -> its value may be
        // an array (children), an object (map of children), or a primitive (leaf).
        const m: any = element as any;
        const keys = Object.keys(m);
        if (keys.length === 0) {
            return [];
        }
        const value = m[keys[0]];

        if (value == null) {
            return [];
        }

        if (Array.isArray(value)) {
            // Already an array of Meta nodes (as produced by getMetas)
            return value as Meta[];
        }

        if (typeof value === 'object') {
            // Convert object properties into Meta nodes { key: value }
            const children: Meta[] = [];
            for (const k of Object.keys(value)) {
                children.push({ [k]: value[k] } as Meta);
            }
            return children;
        }

        // Primitive value -> no children
        return [];
    }

    // Get each tree items.
    getTreeItem(meta: Meta): vscode.TreeItem {
        const m: any = meta as any;
        let label: string | undefined;
        let value: any;
        // As the object key is dynamic, extract it here.
        for (const key of Object.keys(m)) {
            label = key;
            value = m[key];
            break; // only first key expected
        }

        if (!label) {
            return new vscode.TreeItem('?', vscode.TreeItemCollapsibleState.None);
        }

        // Determine collapsible state: expanded if the node has children (object or array)
        let state = vscode.TreeItemCollapsibleState.None;
        if (value !== null && (Array.isArray(value) || typeof value === 'object')) {
            state = vscode.TreeItemCollapsibleState.Expanded; // show expanded by default
        }
        const treeItem = new vscode.TreeItem(label, state); // None / Collapsed / Expanded

        // Description: for primitives show the value, for objects show a summary
        if (value == null) {
            treeItem.description = '';
        } else if (typeof value === 'object') {
            if (Array.isArray(value)) {
                treeItem.description = `(${value.length})`;
            } else {
                const keys = Object.keys(value);
                treeItem.description = `(${keys.length})`;
            }
        } else {
            treeItem.description = String(value);
        }

        // Trim long descriptions when the label is 'description' so the tree remains readable.
        if (label === 'description' && typeof treeItem.description === 'string') {
            const MAX = 25;
            // Trim long descriptions and add a command to show full description on click.
            if (treeItem.description.length > (MAX-3)) {
                treeItem.description = treeItem.description.substring(0, MAX).trimEnd() + '...';
            }
        }
        treeItem.tooltip = treeItem.description;

        // Use a ThemeIcon so the icon displays correctly in the tree view
        switch (label) {
            case 'properties':
            case 'labels':
                treeItem.iconPath = new vscode.ThemeIcon('tag');
                break;
            case 'owner':
                treeItem.iconPath = new vscode.ThemeIcon('account');
                break;
            case 'description':
                treeItem.iconPath = new vscode.ThemeIcon('comment');
                break;
            case 'Rules':
                treeItem.iconPath = new vscode.ThemeIcon('gear');
                break;
            case 'version':
                treeItem.iconPath = new vscode.ThemeIcon('check');
                break;
            case 'systemDefined':
                treeItem.iconPath = new vscode.ThemeIcon('hubot');
                break;
            case 'References':
                treeItem.iconPath = new vscode.ThemeIcon('references');
                break;
            case 'artifactType':
                treeItem.iconPath = {
                    dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'dark', value.toLowerCase() + '.svg'),
                    light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'light', value.toLowerCase() + '.svg')
                };
                break;
            default:
                treeItem.iconPath = new vscode.ThemeIcon('dash');
        }
        return treeItem;
    }
}


export class ApicurioMetasExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new ApicurioMetasExplorerProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.createTreeView('apicurioMetasExplorer', {
                treeDataProvider,
                showCollapseAll: true,
            })
        );
        // Register commands
        vscode.commands.registerCommand('apicurioMetasExplorer.refresh', (element: ActiveElement, data?:Artifact, clear?: boolean) => treeDataProvider.refresh(element, data, clear));
        vscode.commands.registerCommand('apicurioMetasExplorer.getChildren', (element, data) =>
            treeDataProvider.getChildren(element, data)
        );
        vscode.commands.registerCommand('apicurioMetasExplorer.displayMetasValue', () => treeDataProvider.displayMetasValue());
    }
}