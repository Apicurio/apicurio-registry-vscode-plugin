'use strict';

import * as vscode from 'vscode';
import { ApicurioExplorer } from './apicurioExplorer';
import { ApicurioArtifactsExplorer } from './apicurioArtifactsExplorer';
import { ApicurioBranchesExplorer } from "./apicurioBranchesExplorer";
import { ApicurioArtifactVersionsExplorer } from './apicurioArtifactVersionsExplorer';
import { ApicurioMetasExplorer } from './apicurioMetasExplorer';

export function activate(context: vscode.ExtensionContext) {
    new ApicurioExplorer(context);
    new ApicurioBranchesExplorer(context);
    new ApicurioArtifactsExplorer(context);
    new ApicurioArtifactVersionsExplorer(context);
    new ApicurioMetasExplorer(context);
}
