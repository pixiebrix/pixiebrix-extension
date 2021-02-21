/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ExtensionPoint } from "@/types";
import { isHost } from "@/extensionPoints/helpers";
import startCase from "lodash/startCase";
import Mustache from "mustache";
import {
  BlockConfig,
  blockList,
  BlockPipeline,
  reducePipeline,
} from "@/blocks/combinators";
import { propertiesToSchema } from "@/validators/generic";
import { IExtension, IReader } from "@/core";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { Permissions } from "webextension-polyfill-ts";

interface MentionConfig {
  caption: string;
  action: BlockConfig | BlockPipeline;
}

type EntityType = "organization" | "person";

class MentionAction extends ExtensionPoint<MentionConfig> {
  private readonly entityType: EntityType;

  protected $links: JQuery | undefined;

  public get defaultOptions() {
    return { caption: "Action for {{name}}" };
  }

  constructor(entityType: EntityType) {
    super(
      `techcrunch/${entityType}-mention-action`,
      `TechCrunch ${startCase(entityType)} Link Action`,
      `Add a button next to each ${entityType} mention in an article`,
      "faMousePointer"
    );
    this.entityType = entityType;
    this.$links = undefined;
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

  permissions: Permissions.Permissions = {
    permissions: ["tabs", "webNavigation"],
    origins: ["https://*.techcrunch.com/*"],
  };

  async isAvailable() {
    return isHost("techcrunch.com");
  }

  async defaultReader() {
    return (await blockRegistry.lookup(
      `techcrunch/${this.entityType}-mention`
    )) as IReader;
  }

  protected removeExtensions(): void {
    console.warn("removeExtensions not implemented for mention extensionPoint");
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
    const reader = await this.defaultReader();
    const ctxt = await reader.read($link.get(0));

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
        reducePipeline(action, ctxt, extensionLogger, document);
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
