import { ExtensionPoint } from "@/types";
import { isHost } from "@/extensionPoints/helpers";
import startCase from "lodash/startCase";
import Mustache from "mustache";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import {
  BlockConfig,
  blockList,
  BlockPipeline,
  reducePipeline,
} from "@/blocks/combinators";
import { propertiesToSchema } from "@/validators/generic";
import { IExtension, IReader, Logger } from "@/core";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { BackgroundLogger } from "@/background/logging";

interface MentionConfig {
  caption: string;
  action: BlockConfig | BlockPipeline;
}

type EntityType = "organization" | "person";

class MentionAction extends ExtensionPoint<MentionConfig> {
  private readonly entityType: EntityType;

  protected logger: Logger;
  protected $links: JQuery | undefined;

  public get defaultOptions() {
    return { caption: "Action for {{name}}" };
  }

  constructor(entityType: EntityType) {
    super(
      `techcrunch/${entityType}-mention-action`,
      `TechCrunch ${startCase(entityType)} Link Action`,
      `Add a button next to each ${entityType} mention in an article`,
      faMousePointer
    );
    this.entityType = entityType;
    this.$links = undefined;
    this.logger = new BackgroundLogger({ extensionPointId: this.id });
  }

  inputSchema = propertiesToSchema({
    caption: {
      type: "string",
      description: "The caption for the button.",
    },
    action: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
      description: "The action to perform when clicked.",
    },
  });

  getBlocks(extension: IExtension<MentionConfig>) {
    return blockList(extension.config.action);
  }

  permissions = {
    permissions: ["tabs", "webNavigation"],
    origins: ["https://*.techcrunch.com/*"],
  };

  async isAvailable() {
    return isHost("techcrunch.com");
  }

  defaultReader() {
    return blockRegistry.lookup(
      `techcrunch/${this.entityType}-mention`
    ) as IReader;
  }

  async install() {
    if (!(await this.isAvailable())) {
      return false;
    }
    this.$links = $(`article a[data-type="${this.entityType}"]`);
    console.log(`Found ${this.$links.length} ${this.entityType} link(s)`);
    return !!this.$links.length;
  }

  async runOne($link: JQuery) {
    const reader = this.defaultReader();
    const ctxt = await reader.read($link);

    for (const extension of this.extensions) {
      const { caption, action } = extension.config;
      const extensionLogger = this.logger.childLogger({
        extensionId: extension.id,
      });

      const $button = $(
        Mustache.render("<button>{{caption}}</button>", {
          caption: Mustache.render(caption, ctxt),
        })
      );
      $button.attr("data-pixiebrix-uuid", extension.id);

      $button.on("click", () => {
        reducePipeline(action, ctxt, extensionLogger);
      });

      const $existingButton = $link
        .parent()
        .find(`[data-pixiebrix-uuid="${extension.id}"`);

      if ($existingButton.length) {
        // shouldn't need to unbind click handlers because we're replace it outright
        $existingButton.replaceWith($button);
      } else {
        $link.after($button);
      }
    }
  }

  async run() {
    if (this.$links?.length) {
      await Promise.all(this.$links.map((_, link) => this.runOne($(link))));
    }
  }
}

extensionPointRegistry.register(
  new MentionAction("organization"),
  new MentionAction("person")
);
