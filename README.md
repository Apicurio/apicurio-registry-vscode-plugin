# Apicurio Registry Explorer

[![Current Version](https://img.shields.io/visual-studio-marketplace/v/apicurio.apicurio-registry-explorer.svg?color=emerald&label=Visual%20Studio%20Marketplace&logo=visual-studio-code&logoColor=blue&style=flat)][marketplace]
![Install Count](https://img.shields.io/visual-studio-marketplace/i/apicurio.apicurio-registry-explorer.svg?color=emerald&style=flat)
![downloads Count](https://img.shields.io/visual-studio-marketplace/d/apicurio.apicurio-registry-explorer.svg?color=emerald&style=flat)
[![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/apicurio/apicurio-registry-vscode-plugin.svg?color=emerald&label=release&logoColor=white&logo=github&labelColor=grey)][github]
![license](https://img.shields.io/badge/license-Apache_2-brightgreen.svg)

![Apicurio](/resources/apicurio_icon.png)

Explore any [Apicurio registry](https://www.apicur.io/registry/) with ease on your IDE.

## Features

Apicurio registry explorer support Apicurio Core [V2](https://www.apicur.io/registry/docs/apicurio-registry/2.6.x/assets-attachments/registry-rest-api.htm) and [V3](https://www.apicur.io/registry/docs/apicurio-registry/3.1.x/assets-attachments/registry-rest-api.htm) APIs (Some features may not availables on v2).

![Apicurio](/resources/apicurio-explorer.png)

### Explore registry

- [X] Explore groups
- [X] Explore artifacts by ID or Names (see settings)
- [ ] Search artifacts
- [X] Explore artifacts branches
- [X] Explore artifacts versions
- [X] Explore artifacts versions comment
- [X] Explore metas (Groups, Artifacts, Branches, Versions)
- [X] Preview artifacts versions on your IDE
- [X] Preview artifacts versions dereferenced on your IDE
- [X] Preview OPENAPI with swaggerPreview (using [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) if available)

![Apicurio](/resources/screen/apicurio-screen.jpeg)

![Apicurio](/resources/screen/apicurio-groups-explorer.png)

![Apicurio](/resources/screen/apicurio-artifacts-explorer.png)

![Apicurio](/resources/screen/apicurio-artifacts-explorer-filtered.png)

![Apicurio](/resources/screen/apicurio-branches-explorer.png)

![Apicurio](/resources/screen/apicurio-versions-explorer.png)

![Apicurio](/resources/screen/apicurio-versions-explorer-filtered.png)

![Apicurio](/resources/screen/apicurio-metas-explorer.png)

### Content Edition

- [X] Add new group
- [x] Add new artifacts
- [ ] Add new artifacts branch
- [x] Add artifact versions
- [x] Add artifact versions comment
- [ ] Edit artifacts versions metas
- [ ] Edit artefacts versions state
- [ ] Delete artifacts

## Installation

### Extension Marketplace

This extension is published in the [VSCode marketplace][marketplace].

1. Run [Install Extensions][Install Extensions] from the [Command Palette][Command Palette]
2. Search and choose  .

Also available on [open-vsx.org][openvsx].

## Settings

- `apicurio.api.version` : Apicurio Core Registry API version.
- `apicurio.http.secure` : Acces to Apicurio registry API over http or https.
- `apicurio.http.host` : Apicurio registry host.
- `apicurio.http.path` : Apicurio registry path.
- `apicurio.http.port` : Apicurio registry port.
- `apicurio.search.limit` : Custom API limit (Apicurio default is 20).
- `apicurio.explorer.name` : Display name (if exist) instead of ID in registry explorer view.
- `apicurio.versions.reverse` : Reverse Versions order by default.
- `apicurio.tools.preview.format` : Format document on preview.
- `apicurio.tools.preview.OPENAPI` : Use or not Swagger-preview if [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) plugin is available for OPENAPI.

## Using multiples registries

If you use differents registries on different projects, use Workspace settings to override defaults.
You car use the the `Settings` > `Workspace` > `Apicurio` pannel or create a `.vscode/setttings.json` file.

## Release Notes

See [Changelog][Changelog].

## Known Issues

[GitHub issues][issues]

Feel free to report any [issues][new issue].

## Related Projects

See [apicurio.io](https://www.apicur.io/)

## License

[Apache-2.0 license][license]

## Contribute

Contributions welcome.

Kindly contributed from the original project to the Apicurio organization by [jetmartin][jetmartin].

[humans txt][humanstxt]

[jetmartin]: https://github.com/jetmartin
[github]: https://github.com/Apicurio/apicurio-registry-vscode-plugin
[issues]: https://github.com/Apicurio/apicurio-registry-vscode-plugin/issues
[new issue]: https://github.com/Apicurio/apicurio-registry-vscode-plugin/issues/new
[Changelog]: https://github.com/Apicurio/apicurio-registry-vscode-plugin/blob/main/CHANGELOG.md
[humanstxt]: https://github.com/Apicurio/apicurio-registry-vscode-plugin/blob/main/humans.txt
[license]: https://github.com/Apicurio/apicurio-registry-vscode-plugin/blob/main/LICENSE
[marketplace]: https://marketplace.visualstudio.com/items?itemName=apicurio.apicurio-registry-explorer
[openvsx]: https://open-vsx.org/extension/apicurio/apicurio-registry-explorer
[openvsx-dt]: https://img.shields.io/open-vsx/dt/apicurio/apicurio-registry-explorer
[command palette]: https://code.visualstudio.com/Docs/editor/codebasics#_command-palette
[install extensions]: https://code.visualstudio.com/docs/editor/extension-gallery#_install-an-extension
