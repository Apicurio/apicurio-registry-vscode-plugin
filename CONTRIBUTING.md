# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue or any other method with the owners of this repository before making a change.

Please note that this project is maintain on free personal time, be kind and do not except immediate answers.

## Prereqisites

This extension is best developed in Visual Studio Code (VSC) itself. Even if you use other IDE to edit the code, VSC is required for debugging.

### Visual Studio Code

To set up your VSC, install the following extensions:

-   [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

    Run **ctrl+P** and then `ext install esbenp.prettier-vscode`.

    The extension will automatically format the code on file save, or you can run **ctrl+shift+I** or **ctrl+shift+P -> Format Document**.

-   [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

    Run **ctrl+P** and then `ext install dbaeumer.vscode-eslint`.

### Run Apicurio Registry

You can run a local Apicurio Registry instance with docker:

```sh
docker run -it -p 8080:8080 apicurio/apicurio-registry-mem:latest-release
```

It will be available at http://localhost:8080.

### Visual Studio Code Extensions (VSCE) tool

To package the extension for publishing, you need the `vsce` executable, which can be installed by running:

```sh
npm install -g @vscode/vsce
```

## Install

```sh
npm install
```

## Developp

Use the **Run and Debug** panel to run and debug the extension. Make sure the **Run Extension** task is selected and press **F5**.

The task will compile the extention and launch a VSC instance with the extension loaded.

## Package

Using VSCE, run:

```sh
vsce package
```
