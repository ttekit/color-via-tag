import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	ButtonComponent,
	TFile
} from 'obsidian';
import {forEach} from "builtin-modules";

export interface TagMapping {
	mainTag: string;
	additionalTag: string;
}

interface ColorViaTagSettings {
	tagMappings: TagMapping[];
	DEFAULT_COLOR_TAG_NAME: string;
}

const DEFAULT_SETTINGS: ColorViaTagSettings = {
	tagMappings: [],
	DEFAULT_COLOR_TAG_NAME: "color"
}


export interface MyPluginSettings {
}

export default class ColorViaTag extends Plugin {
	settings: ColorViaTagSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	async getFilesWithTag(tag: string): Promise<TFile[]> {
		const notes: TFile[] = [];

		this.app.vault.getMarkdownFiles().forEach((file: TFile) => {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) return;

			if (cache.tags) {
				for (const t of cache.tags) {
					if (t.tag === `#${tag}`) {
						notes.push(file);
						return; // already matched, skip further checks
					}
				}
			}

			if (cache.frontmatter && cache.frontmatter["tags"]) {
				const frontTags = Array.isArray(cache.frontmatter["tags"])
					? cache.frontmatter["tags"]
					: [cache.frontmatter["tags"]];
				if (frontTags.includes(tag)) {
					notes.push(file);
				}
			}
		});

		return notes;
	}

	async addProperty(file: TFile, key: string, value: any): Promise<"added" | "updated"> {
		let status: "added" | "updated" = "added";
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter[key] !== undefined) {
				status = "updated";
			}
			frontmatter[key] = value;
		});
		return status;
	}

	async removeProperty(file: TFile, key: string) {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter[key] !== undefined) {
				delete frontmatter[key];
			}
		});
	}


	public applyTagMappings() {
		this.settings.tagMappings.forEach(element => {
			console.log(element);
			this.getFilesWithTag(element.mainTag).then(files_array => {
				files_array.forEach((file) => {
					this.addProperty(file, this.settings.DEFAULT_COLOR_TAG_NAME, element.additionalTag)
					console.log(file);

				})
			})
		})
	}

	public removeTagMappings(id: number) {
		this.getFilesWithTag(this.settings.tagMappings[id].mainTag).then(files_array => {
			files_array.forEach((file) => {
				this.removeProperty(file, this.settings.DEFAULT_COLOR_TAG_NAME)
			})
		})
	}

}


class SampleSettingTab extends PluginSettingTab {
	plugin: ColorViaTag;

	constructor(app: App, plugin: ColorViaTag) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Table container
		const table = containerEl.createEl("div", {cls: "tag-mapping-table"});

		// Render each mapping row
		this.plugin.settings.tagMappings.forEach((mapping, index) => {
			this.renderMappingRow(table, mapping, index);
		});

		// Add new row button
		new Setting(containerEl)
			.addButton((btn) => {
				btn.setButtonText("Add Row")
					.setCta()
					.onClick(() => {
						this.plugin.settings.tagMappings.push({mainTag: "", additionalTag: ""});
						this.plugin.saveSettings();
						this.display();
					});
			});

		// Confirm button
		new Setting(containerEl)
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText("Confirm")
					.setCta()
					.onClick(async () => {
						await this.plugin.applyTagMappings();
					});
			});

	}

	private renderMappingRow(table: HTMLElement, mapping: TagMapping, index: number) {
		const row = table.createDiv({cls: "tag-mapping-row"});

		// Main tag input
		const mainInput = row.createEl("input", {
			type: "text",
			value: mapping.mainTag,
			placeholder: "Main tag"
		});
		mainInput.oninput = (e: any) => {
			this.plugin.settings.tagMappings[index].mainTag = e.target.value;
			this.plugin.saveSettings();
		};

		// Additional tag input
		const additionalInput = row.createEl("input", {
			type: "text",
			value: mapping.additionalTag,
			placeholder: "Additional tag"
		});
		additionalInput.oninput = (e: any) => {
			this.plugin.settings.tagMappings[index].additionalTag = e.target.value;
			this.plugin.saveSettings();
		};

		// Delete button
		const delBtn = row.createEl("button", {text: "✕"});
		delBtn.onclick = () => {
			this.plugin.removeTagMappings(index);
			this.plugin.settings.tagMappings.splice(index, 1);
			this.plugin.saveSettings();
			this.display();
		};
	}
}
