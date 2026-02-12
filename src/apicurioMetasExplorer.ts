'use strict';

import * as vscode from 'vscode';
import { Meta, ActiveElement, ElementType, Group, Artifact, ArtifactVersion, States } from './interfaces';
import { Services } from './tools/services';
import { Settings } from './tools/settings';

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
    private ActiveDataObject: Artifact | ArtifactVersion;
    private settings: Settings;

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
    public refresh(element: ActiveElement, data?: Artifact, clear?: boolean): any {
        this.ActiveElement = { id: element.id, type: element.type };
        if (data) { this.ActiveDataObject = data; }
        if (clear) {
            this.ActiveElement = { id: null, type: null };
            this.ActiveDataObject = null;
        }
        this.onDidChangeTreeDataEmitter.fire();
        return;
    }
    // Get Metas
    private async getMetas(element: ActiveElement, data?: Group | Artifact | ArtifactVersion): Promise<Meta[]> {
        // If no element or invalid element provided, fallback to default group
        if (!element || !element.id) {
            // Use default group id expected by the registry client
            element = { id: this.settings.getDefaultGroup().groupId, type: ElementType.GROUP } as ActiveElement;
        }
        try {
            let result = [];
            let metas = [];
            // Fetch metas for the active element and await the promise
            switch (this.ActiveElement.type) {
                case ElementType.GROUP:
                    // Manage exception for default Group metas fetching
                    if (element.id === this.settings.getDefaultGroup().groupId) {
                        metas = [{ 'groupId': this.settings.getDefaultGroup().groupId }, { 'description': this.settings.getDefaultGroup().description }];
                    }
                    else {
                        // Request metas for the active element
                        result = await Services.get().getRegistryClient().getMetas(element).then(res => {
                            // Manage v2 retro-compatibility.
                            if (this.settings.getApicurioApiVersion() == "v2") {
                                res = Services.get().v2tov3Group(res);
                            }
                            return res;
                        });
                        metas.push(...this.queryResultToMetas(result));
                        // Request rules for the active element
                        if (this.settings.getApicurioApiVersion() != "v2") {
                            // Fetch Group rules for the active group and await the promise
                            result = await Services.get().getRegistryClient().getGroupRules(element);
                            if (result.length != 0) {
                                const rulesConfigs = [];
                                for (const i in result) {
                                    const rulesResult = await Services.get().getRegistryClient().getGroupRulesConfig(element, result[i]);
                                    rulesConfigs.push(rulesResult);
                                }
                                const rules = { 'Rules': this.queryResultToMetas(rulesConfigs, true) };
                                metas.push(rules);
                            }
                        }
                    }
                    break;
                case ElementType.ARTIFACT:
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    // Fetch Artifact rules for the active artifact and await the promise
                    if (this.settings.getApicurioApiVersion() != "v2") {
                        result = await Services.get().getRegistryClient().getArtifactRules(this.ActiveDataObject);
                        if (result) {
                            const rulesConfigs = [];
                            for (const i in result) {
                                const rulesResult = await Services.get().getRegistryClient().getArtifactRulesConfig(this.ActiveDataObject, result[i]);
                                rulesConfigs.push(rulesResult);
                            }
                            if (rulesConfigs.length) {
                                const rules = { 'Rules': this.queryResultToMetas(rulesConfigs, true) };
                                metas.push(rules);
                            }
                        }
                    }
                    break;
                case ElementType.VERSION:
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    // Fetch References rules for the active artifact Version and await the promise
                    if (this.settings.getApicurioApiVersion() != "v2") {
                        result = await Services.get().getRegistryClient().getArtifactReferences(this.ActiveDataObject as ArtifactVersion);
                        if (result) {
                            const refs: any[] = [];
                            for (const i in result) {
                                refs[i] = {};
                                refs[i][result[i].name] = result[i];
                            }
                            const references = { 'References': refs };
                            metas.push(references);
                        }
                    }
                    break;
                default:
                    result = await Services.get().getRegistryClient().getMetas(element, this.ActiveDataObject);
                    metas = this.queryResultToMetas(result);
                    break;
            }
            /**
             * @TODO: Look form perf improvment.
             */
            // If meta is missing, show empty meta for proper display if not default group.
            if((this.ActiveElement.id == this.settings.getDefaultGroup().groupId && this.ActiveElement.type == ElementType.GROUP) == false){
                // look for 'labels' key in each metas on object key in array
                if (metas.findIndex(meta => Object.keys(meta)[0] === 'labels') === -1) {
                    // If type has labels, add empty labels object for proper display
                    if(this.ActiveElement.type == ElementType.GROUP ||
                        this.ActiveElement.type == ElementType.ARTIFACT ||
                        this.ActiveElement.type == ElementType.VERSION){
                            const emptyLabels: any[] = [];
                            const labels = { 'labels': emptyLabels };
                            metas.push(labels);
                    }
                }
                // look for 'description' key in each metas on object key in array
                if (metas.findIndex(meta => Object.keys(meta)[0] === 'description') === -1) {
                    // If type has description, add empty description for proper display
                    if(this.ActiveElement.type == ElementType.GROUP ||
                        this.ActiveElement.type == ElementType.ARTIFACT ||
                        this.ActiveElement.type == ElementType.VERSION ||
                        this.ActiveElement.type == ElementType.BRANCH){
                            const description = { 'description': '' };
                            metas.push(description);
                    }
                }
            }
            return metas;
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error fetching metas: ${err}`);
            return [];
        }
    }

    private queryResultToMetas(result, rules?: boolean) {
        // @Todo: Manage proper display of Rules.
        // @Todo: request for rules settigns and display it.
        const metas: Meta[] = [];
        const children: Meta[] = [];
        // Rules managment
        if (rules) {
            for (const i in result) {
                metas.push({ [`${result[i].ruleType}`]: `${result[i].config}` } as Meta);
            }
        }
        // Others metas managment
        else {
            for (const i in result) {
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
            const arrayHeader = `\n| Meta      | Value |\n| ----------- | ----------- |`;
            let value: string = `${arrayHeader}`;
            const values: string[] = [];
            let i = 0;
            for (const meta of metas) {
                const key = Object.keys(meta)[0];
                const val = (meta as any)[key];
                // If the value is an array, iterate children (each child is a { key: value } Meta)
                if (Array.isArray(val)) {
                    values[i] = `\n\n## ${key}\n${arrayHeader}`;
                    for (const child of val) {
                        const childKey = Object.keys(child)[0];
                        let childVal = child[childKey];
                        let stringVal = '';
                        // If the value is an object, list its properties
                        if (childVal && typeof childVal === 'object') {
                            for (const prop of Object.keys(childVal)) {
                                stringVal += `- **${prop}**: \`${childVal[prop]}\` `;
                            }
                            childVal = stringVal;
                        }
                        values[i] += `\n| ${childKey} | ${childVal} |`;
                    }
                } else if (val && typeof val === 'object') {
                    // If it's an object (map), list its properties
                    values[i] = `\n## ${key}\n${arrayHeader}`;
                    for (const prop of Object.keys(val)) {
                        values[i] += `\n| ${prop} | ${val[prop]} |`;
                    }
                } else {
                    // Primitive value
                    value += `\n| ${key} | ${val} |`;
                }
                i++;
            }
            if (values.length) {
                value += `\n${values.join("")}`;
            }
            vscode.workspace.openTextDocument({
                content: `# ${this.ActiveElement.type}: ${this.ActiveElement.id}\n${value}\n`,
                language: 'markdown'
            }).then(doc => {
                vscode.window.showTextDocument(doc, { preview: false });
            });
        });
    }

    public editLabel() {
        // Prompt the user to enter a new label key and value
        vscode.window.showInputBox({ prompt: 'Enter label key (use existing key to edit existing label value)' }).then(async (input) => {
            if (!input) {
                vscode.window.showErrorMessage('Label key is required.');
                return;
            }
            const labelKey = input;
            vscode.window.showInputBox({ prompt: 'Enter optional label value' }).then(async (input) => {
                // Confirm input diplayed as key:value
                const labelValue = input || '';
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Add label "${labelKey}:${labelValue}" to ${this.ActiveElement.type} "${this.ActiveElement.id}"?`
                });
                if (confirm !== 'Yes') {
                    return;
                }
                // Add the label via the registry client
                try {
                    // @Todo: manage Issue on Groups, missing datas in ActiveDataObject.
                    await Services.get().getRegistryClient().editLabel(this.ActiveElement, this.ActiveDataObject, labelKey, labelValue);
                    vscode.window.showInformationMessage(`Label "${labelKey}:${labelValue}" added to ${this.ActiveElement.type} "${this.ActiveElement.id}".`);
                    // Refresh the tree view to show the new label
                    this.refresh(this.ActiveElement, this.ActiveDataObject);
                } catch (err) {
                    vscode.window.showErrorMessage(`Error adding label: ${JSON.stringify(err)}`);
                }
            });
        });
    }
    public async removeLabel() {
        // Prompt the user to enter a new label key and value
        const labelsDisplay = Object.keys(this.ActiveDataObject.labels);
        const label = await vscode.window.showQuickPick(labelsDisplay, {
            placeHolder: `Choose a label to delete.`
        });
        if (!label) {
            vscode.window.showErrorMessage('Label key is required.');
            return;
        }
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Remove label "${label}" from ${this.ActiveElement.type} "${this.ActiveElement.id}"?`
        });
        if (confirm !== 'Yes') {
            return;
        }
        try {
            // @Todo: manage Issue on Groups, missing datas in ActiveDataObject.
            await Services.get().getRegistryClient().removeLabel(this.ActiveElement, this.ActiveDataObject, label);
            vscode.window.showInformationMessage(`Label "${label}" removed from ${this.ActiveElement.type} "${this.ActiveElement.id}".`);
            // Refresh the tree view to show the new label
            this.refresh(this.ActiveElement, this.ActiveDataObject);
        } catch (err) {
            vscode.window.showErrorMessage(`Error removing label: ${JSON.stringify(err)}`);
        }
    }
    public editDescription() {
        vscode.window.showInputBox({ prompt: 'Edit description', value: this.ActiveDataObject.description }).then(async (input) => {
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Edit description to: "${(input) ? input : ''}"?`
            });
            if (confirm !== 'Yes') {
                return;
            }
            try {
                await Services.get().getRegistryClient().editDescription(this.ActiveElement, this.ActiveDataObject, (input) ? input : '');
                // Refresh the tree view to show the new description.
                // @TODO: manage proper views variable updates. In case of re-edition, display the cached value.
                this.refresh(this.ActiveElement, this.ActiveDataObject);
            } catch (err) {
                vscode.window.showErrorMessage(`Error description edit: ${JSON.stringify(err)}`);
            }
        });
    }
    public editName() {
        vscode.window.showInputBox({ prompt: 'Edit name', value: this.ActiveDataObject.name }).then(async (input) => {
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Edit name to: "${(input) ? input : ''}"?`
            });
            if (confirm !== 'Yes') {
                return;
            }
            try {
                await Services.get().getRegistryClient().editName(this.ActiveElement, this.ActiveDataObject, (input) ? input : '');
                // Refresh the tree view to show the new name.
                // @TODO: manage update of parent views if name is displayed there.
                // @TODO: manage proper views variable updates. In case of re-edition, display the cached value.
                this.refresh(this.ActiveElement, this.ActiveDataObject);
            } catch (err) {
                vscode.window.showErrorMessage(`Error name edit: ${JSON.stringify(err)}`);
            }
        });
    }
    public async editReferences(){
        // API limitation test.
        if (this.ActiveDataObject.state && this.ActiveDataObject.state != States.DRAFT) {
            vscode.window.showErrorMessage(`References can only be edited on artifacts if state is "${States.DRAFT}" and if allowed in registry settings.`);
            return;
        }
        // if references are not loaded in artefact get it.
        if(!this.ActiveDataObject.references){
            let refs = await Services.get().getRegistryClient().getArtifactReferences(this.ActiveDataObject as ArtifactVersion);
            this.ActiveDataObject.references = refs;
        }
        //get name form each refs object in array.
        let labelsDisplay = [];
        for(let i in this.ActiveDataObject.references){
            labelsDisplay.push({
                label: this.ActiveDataObject.references[i].name,
                id: i
            });
        }
        // Add at the end to properly increment ID in array.
        labelsDisplay.push({
            label: this.settings.getAddReferenceLabel(),
            id: labelsDisplay.length
        });
        // Prompt the user to choose or add a reference.
        const reference = await vscode.window.showQuickPick(labelsDisplay, {
            placeHolder: `Choose a reference to edit`
        });
        if (!reference) {
            vscode.window.showErrorMessage('Reference key is required.');
            return;
        }
        // Edit Reference values
        let currentReference = ( reference.id != labelsDisplay.length) ? this.ActiveDataObject.references[reference.id] : this.settings.getEmptyReference();
        currentReference.name = await vscode.window.showInputBox({ prompt: 'Edit reference name', value: currentReference.name });
        currentReference.groupId = await vscode.window.showInputBox({ prompt: 'Edit reference artifact group', value: currentReference.groupId });
        currentReference.artifactId = await vscode.window.showInputBox({ prompt: 'Edit reference artifact Id', value: currentReference.artifactId });
        currentReference.version = await vscode.window.showInputBox({ prompt: 'Edit reference artifact version', value: currentReference.version });
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Confirm to edit reference "${currentReference.name}" from ${this.ActiveElement.type} "${this.ActiveElement.id}"?`
        });
        if (confirm !== 'Yes') {
            return;
        }
        try {
            // @Todo: manage Issue on Groups, missing datas in ActiveDataObject.
            await Services.get().getRegistryClient().editReferences(this.ActiveElement, this.ActiveDataObject, reference, currentReference);
            vscode.window.showInformationMessage(`Reference "${currentReference.name}" upodated for ${this.ActiveElement.type} "${this.ActiveElement.id}".`);
            // Refresh the tree view to show the new label
            this.refresh(this.ActiveElement, this.ActiveDataObject);
        } catch (err) {
            vscode.window.showErrorMessage(`Error edditing reference: ${JSON.stringify(err)}`);
        }
    }

    /**
     * End of Contextual menu actions
     */

    // Get all tree Datas
    // NOTE: when `element` is undefined, VS Code asks for root items; when `element` is a Meta,
    // VS Code asks for the children of that Meta node.
    async getChildren(element?: Meta, data?: Group | Artifact | ArtifactVersion): Promise<Meta[]> {
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
            if (treeItem.description.length > (MAX - 3)) {
                treeItem.description = treeItem.description.substring(0, MAX).trimEnd() + '...';
            }
        }
        treeItem.tooltip = treeItem.description;

        // Use a ThemeIcon so the icon displays correctly in the tree view
        // Addditional contextValue for contextual menu management
        switch (label) {
            case 'properties':
            case 'labels':
                treeItem.iconPath = new vscode.ThemeIcon('tag');
                treeItem.contextValue = 'isLabels';
                break;
            case 'owner':
                treeItem.iconPath = new vscode.ThemeIcon('account');
                break;
            case 'description':
                treeItem.iconPath = new vscode.ThemeIcon('comment');
                treeItem.contextValue = 'isDescription';
                break;
            case 'name':
                treeItem.iconPath = new vscode.ThemeIcon('info');
                treeItem.contextValue = 'isName';
                break;
            case 'Rules':
                treeItem.iconPath = new vscode.ThemeIcon('gear');
                treeItem.contextValue = 'isRules';
                break;
            case 'version':
                treeItem.iconPath = new vscode.ThemeIcon('check');
                break;
            case 'systemDefined':
                treeItem.iconPath = new vscode.ThemeIcon('hubot');
                break;
            case 'References':
                treeItem.iconPath = new vscode.ThemeIcon('references');
                treeItem.contextValue = 'isReferences';
                break;
            case 'modifiedOn':
            case 'createdOn':
                treeItem.iconPath = new vscode.ThemeIcon('clock');
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
        vscode.commands.registerCommand('apicurioMetasExplorer.refresh', (element: ActiveElement, data?: Artifact, clear?: boolean) => treeDataProvider.refresh(element, data, clear));
        vscode.commands.registerCommand('apicurioMetasExplorer.getChildren', (element, data) =>
            treeDataProvider.getChildren(element, data)
        );
        vscode.commands.registerCommand('apicurioMetasExplorer.displayMetasValue', () => treeDataProvider.displayMetasValue());
        vscode.commands.registerCommand('apicurioMetasExplorer.editLabel', () => treeDataProvider.editLabel());
        vscode.commands.registerCommand('apicurioMetasExplorer.removeLabel', () => treeDataProvider.removeLabel());
        vscode.commands.registerCommand('apicurioMetasExplorer.editDescription', () => treeDataProvider.editDescription());
        vscode.commands.registerCommand('apicurioMetasExplorer.editName', () => treeDataProvider.editName());
        vscode.commands.registerCommand('apicurioMetasExplorer.editReferences', () => treeDataProvider.editReferences());
        // vscode.commands.registerCommand('apicurioMetasExplorer.removeReferences', () => treeDataProvider.removeReferences());
    }
}