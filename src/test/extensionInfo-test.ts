import { expect } from 'chai';
import { ActivityBar, ExtensionsViewItem, ExtensionsViewSection } from 'vscode-extension-tester';
import package_json from '../../package.json';

// TODO: This finds an already released extension. Skipping because of an info update.
describe.skip('Test extension info', () => {

    let extension: ExtensionsViewItem;

    before(async function() {
        this.timeout(15000);
        const view = await (await new ActivityBar().getViewControl('Extensions'))?.openView();
        const extensions = await view?.getContent().getSection('Installed') as ExtensionsViewSection;
        extension = await extensions.findItem(`@installed ${package_json.displayName}`) as ExtensionsViewItem;
    });

    it('checks the extension info', async () => {
        const author = await extension.getAuthor();
        const desc = await extension.getDescription();
        const version = await extension.getVersion();

        expect(author).to.equal(package_json.publisher);
        expect(desc).to.equal(package_json.description);
        expect(version).to.equal(package_json.version);
    });
});
