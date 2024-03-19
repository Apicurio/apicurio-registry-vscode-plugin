import { expect } from 'chai';
import {
    ActivityBar,
    DefaultTreeSection,
    InputBox,
    Key,
    SideBarView,
    TextSetting,
    VSBrowser,
    Workbench,
} from 'vscode-extension-tester';
import path from 'path';

describe('Create and view a new artifact', () => {
    const GROUP_ID = 'foo';
    const ARTIFACT_ID = 'bar';
    const VERSION = '1';

    const labels = (dialog: InputBox) => dialog.getQuickPicks().then((a) => Promise.all(a.map((b) => b.getLabel())));

    const delay = (ms?: number) => VSBrowser.instance.driver.sleep(ms ? ms : 1000);

    let dialog: InputBox;

    before(async function () {
        this.timeout(25_000);

        await VSBrowser.instance.openResources(path.join('src', 'test', 'resources'));

        const settings = await new Workbench().openSettings();
        const setting = (await settings.findSettingByID('apicurio.http.port')) as TextSetting;

        await setting.setValue('8080'); // TODO: Change the default? Profiles?
        await delay();
    });

    describe('Create a new artifact', () => {
        before(async function () {
            await new Workbench().executeCommand('Add artifact');
            dialog = await InputBox.create();
        });

        it('creates new group ID', async () => {
            expect(await dialog.getTitle()).equals('New or existing group ?');
            expect(await labels(dialog)).to.have.members(['NEW', 'EXISTING']);
            await dialog.selectQuickPick('NEW');

            expect(await dialog.getTitle()).equals('Create a new Group ID');
            await dialog.setText(GROUP_ID);
            await dialog.sendKeys(Key.ENTER);

            expect(await dialog.getTitle()).equals('Confirm new Group ID');
            await dialog.setText(GROUP_ID);
            await dialog.sendKeys(Key.ENTER);
        });

        it('selects artifact type', async () => {
            expect(await dialog.getTitle()).equals('Choose an artifact type to push :');
            expect(await labels(dialog)).to.have.members([
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
            ]);
            await dialog.selectQuickPick('AVRO');
        });

        it('selects artifact ID', async () => {
            expect(await dialog.getTitle()).equals('Artifact ID');
            await dialog.setText(ARTIFACT_ID);
            await dialog.sendKeys(Key.ENTER);
        });

        it('selects version', async () => {
            expect(await dialog.getTitle()).equals('Initial version');
            await dialog.setText(VERSION);
            await dialog.sendKeys(Key.ENTER);
        });

        it('selects file', async () => {
            expect(await dialog.getTitle()).equals('Search for file :');
            await dialog.setText('avro1.json');
            await dialog.sendKeys(Key.ENTER);
            await dialog.selectQuickPick(0);
            await delay();
        });

        it('confirms', async () => {
            expect(await dialog.getTitle()).to.match(/^Confirm/);
            expect(await labels(dialog)).to.have.members(['yes', 'no']);
            await dialog.selectQuickPick('yes');
        });
    });

    describe('View the new artifact', () => {
        let tree: DefaultTreeSection;

        it('opens apicurio explorer', async () => {
            await (await new ActivityBar().getViewControl('Apicurio Explorer'))?.openView();

            const view = new SideBarView();
            expect(await view.getTitlePart().getTitle()).to.equal('APICURIO EXPLORER');

            tree = (await view.getContent().getSection('Apicurio Explorer')) as DefaultTreeSection;
            expect(await tree.getTitle()).to.equal('Apicurio Explorer');
            expect(await Promise.all((await tree.getActions()).map((a) => a.getLabel()))).to.have.members([
                'Refresh',
                'Search',
                'Collapse All',
                'More Actions...',
            ]);

            await VSBrowser.instance.driver
                .actions()
                .move(await tree.getRect())
                .perform();
            await (await tree.getAction('Refresh')).click();
        });

        it('checks the new artifact', async () => {
            expect(await Promise.all((await tree.getVisibleItems()).map((a) => a.getLabel()))).to.have.members([
                GROUP_ID,
            ]);
            const parent = await tree.findItem(GROUP_ID, 1);
            //console.log('>>> ' + await parent.getDescription()); // TODO
            expect(await parent.getTooltip()).to.equal(GROUP_ID + ' '); // TODO
            await parent.expand();

            expect(await Promise.all((await parent.getChildren()).map((a) => a.getLabel()))).to.have.members([
                ARTIFACT_ID,
            ]);
            const child = await parent.findChildItem(ARTIFACT_ID);
            expect(await child.getDescription()).to.equal('enabled');
            expect(await child.getTooltip()).to.equal('User');
        });
    });
});
