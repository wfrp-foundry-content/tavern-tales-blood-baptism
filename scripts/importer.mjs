
/**
 * A custom dialog responsible for prompting the user to import adventure content
 * @extends Dialog
 */
class AdventureImporter extends Dialog {
  constructor(...args) {
    super(...args)
    this.module = game.modules.get(this.constructor.MODULE_NAME);
  }

  /**
   * The module name being configured
   * @type {string}
   */
  static MODULE_NAME = "tavern-tales-adventures-wfrp";

  /**
   * The title of the default journal entry to display
   * @type {string}
   */
  static START_JOURNAL_NAME = "Adventure Text"

  /**
   * The name of the initial Scene to activate
   * @type {string}
   */
  static START_SCENE_NAME = "Blood Baptism"

  /**
   * The color to use for imported folders
   * @type {string}
   */
  static FOLDER_COLOR = "#420505"

  /**
   * Prompt the user whether they want to import
   */
  async prompt() {
		return Dialog.confirm({
			title: `${this.module.data.title} Importer`,
			content: "<p>Would you like to import all content for the Blood Baptism adventure into your World?",
			yes: () => this.importAll()
		});
  }

  /**
   * Import all module content
   */
  async importAll() {

  	// Import all content
  	const actors = game.packs.get(`${this.constructor.MODULE_NAME}.actors-wfrp4e`);
  	await this._importPack(actors);
  	const scenes = game.packs.get(`${this.constructor.MODULE_NAME}.scenes-wfrp4e`);
  	await this._importPack(scenes);
  	const journal = game.packs.get(`${this.constructor.MODULE_NAME}.journal-wfrp4e`);
  	await this._importPack(journal);
    const items = game.packs.get(`${this.constructor.MODULE_NAME}.trappings-wfrp4e`);
    await this._importPack(items);

  	// Map Scene tokens using actor names
  	await this._mapTokens(scenes, actors);

  	// Display the starting Journal entry
  	const j1 = game.journal.getName(this.constructor.START_JOURNAL_NAME);
  	await j1.sheet.render(true, {sheetMode: "text"});

  	// Activate the starting Scene
  	const s1 = game.scenes.getName(this.constructor.START_SCENE_NAME);
  	await s1.view();
  }

  /**
   * Import content for a specific pack
   */
  async _importPack(pack) {
  	const label = pack.metadata.label;
  	const type = pack.metadata.entity;
  	let folder = game.folders.find(f => (f.type === type) && (f.name === label));
  	if ( !folder ) folder = await Folder.create({type, name: label, color: this.constructor.FOLDER_COLOR, parent: null});
  	await pack.importAll({folderId: folder.id});
  }

  /**
   * Map dynamic actor links within journal entries to use the new IDs
   */
  async _mapTokens(scenesPack, actorsPack) {
    const sf = game.folders.getName(scenesPack.metadata.label);
    const scenes = sf.content;
    const af = game.folders.getName(actorsPack.metadata.label);
    const actors = af.content;
    for ( let scene of scenes ) {
      const tokens = duplicate(scene.data.tokens).map(t => {
        const a = actors.find(a => a.name === t.name);
        if ( a ) t.actorId = a.id;
        return t;
      })
      await scene.update({tokens});
    }
  }
}

/**
 * Display the importer prompt when a Compendium from the module is viewed
 */
Hooks.on("renderCompendium", (app, html, data) => {
  const packName = isNewerVersion("0.8.0", game.data.version) ? app.collection.split(".")[0] : app.collection.metadata.package;
	if ( (packName !== AdventureImporter.MODULE_NAME) || !game.user.isGM ) return;
	const ai = new AdventureImporter();
	return ai.prompt();
});
