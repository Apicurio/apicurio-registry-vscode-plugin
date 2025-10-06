'use strict';

import * as vscode from 'vscode';
import { ApicurioExplorer } from './apicurioExplorer';
import { ApicurioVersionsExplorer } from './apicurioVersionsExplorer';
import { ApicurioMetasExplorer } from './apicurioMetasExplorer';
import { ApicurioVersionsCommentsExplorer } from './apicurioVersionsCommentsExplorer';

export function activate(context: vscode.ExtensionContext) {
    new ApicurioExplorer(context);
    new ApicurioVersionsExplorer(context);
    new ApicurioMetasExplorer(context);
    new ApicurioVersionsCommentsExplorer(context);
}
