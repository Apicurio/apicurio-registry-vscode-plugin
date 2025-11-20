import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { CurrentArtifact, Group } from './interfaces';
import { Settings } from './settings';

export class ApicurioTools {

    private settings: Settings;

    constructor() {
        this.settings = new Settings();
    }

    public isObject(value: unknown): value is object {
        return value instanceof Object && value.constructor === Object;
    }


    /**
     * Retrive standard list of values, could be API Enums or tooltips options.
     *
     * @returns Array apicurio list.
     */
    public getLists(type: string) {
        let options = [];
        switch (type) {
            case 'confirm':
                options = ['yes', 'no'];
                break;
            case 'edit':
                options = ['Add', 'Delete'];
                break;
            case 'add':
                options = ['NEW', 'EXISTING'];
                break;
            case 'search':
                options = ['name', 'group', 'description', 'type', 'state', 'labels', 'properties'];
                break;
            case 'editableMetas':
                options = ['name', 'description', 'labels'];
                /* V2 - Support both labels & properties. */
                if (this.settings.getApicurioApiVersion() == "v2") {
                    options.push('properties');
                }
                break;
            case 'states':
                options = ['ENABLED', 'DISABLED', 'DEPRECATED'];
                break;
            case 'artifactType':
                options = [
                    'AVRO',
                    'PROTOBUF',
                    'JSON',
                    'OPENAPI',
                    'ASYNCAPI',
                    'GRAPHQL',
                    'KCONNECT',
                    'WSDL',
                    'XSD',
                    'XML',
                ];
                break;
            default:
                break;
        }
        return options;
    }
}
