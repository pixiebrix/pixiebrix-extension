/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {
  InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import {
  IBlock,
  IExtensionPoint,
  IReader,
  ResolvedExtension,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { Manifest, Menus, Permissions } from "webextension-polyfill";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import {
  ExtensionPoint,
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { castArray, cloneDeep, compact, isEmpty, uniq } from "lodash";
import { checkAvailable } from "@/blocks/available";
import {
  ensureContextMenu,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { registerHandler } from "@/contentScript/contextMenus";
import { isErrorObject } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import notify from "@/utils/notify";
import { reportEvent } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { isDeploymentActive } from "@/utils/deployment";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { makeServiceContext } from "@/services/serviceUtils";
import { guessSelectedElement } from "@/utils/selectionController";
import { ContextMenuReader } from "@/extensionPoints/contextMenuReader";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { BusinessError } from "@/errors/businessErrors";

export type ContextMenuTargetMode =
  // In `legacy` mode, the target was passed to the readers but the document is passed to reducePipeline
  "legacy" | "document" | "eventTarget";

export type ContextMenuConfig = {
  title: string;
  action: BlockConfig | BlockPipeline;
};

/**
 * The element the user right-clicked on to trigger the context menu
 */
let clickedElement: HTMLElement = null;
let selectionHandlerInstalled = false;

const BUTTON_SECONDARY = 2;

function setActiveElement(event: MouseEvent): void {
  // This method can't throw, otherwise I think it breaks event dispatching because we're passing
  // useCapture: true to the event listener
  clickedElement = null;
  if (event?.button === BUTTON_SECONDARY) {
    console.debug("Setting right-clicked element for contextMenu", {
      target: event.target,
    });
    clickedElement = event?.target as HTMLElement;
  }
}

function installMouseHandlerOnce(): void {
  if (!selectionHandlerInstalled) {
    selectionHandlerInstalled = true;
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    document.addEventListener("mousedown", setActiveElement, {
      // Handle it first in case a target beneath it cancels the event
      capture: true,
      // For performance, indicate we won't call preventDefault
      passive: true,
    });
  }
}

/**
 * See also: https://developer.chrome.com/extensions/contextMenus
 */
export abstract class ContextMenuExtensionPoint extends ExtensionPoint<ContextMenuConfig> {
  public override get syncInstall() {
    return true;
  }

  abstract getBaseReader(): Promise<IReader>;

  abstract get targetMode(): ContextMenuTargetMode;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  abstract readonly contexts: Menus.ContextType[];

  public get kind(): "contextMenu" {
    return "contextMenu";
  }

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description:
          "The text to display in the item. When the context is selection, use %s within the string to show the selected text.",
      },
      action: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/effect#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
    },
    ["title", "action"]
  );

  async getBlocks(
    extension: ResolvedExtension<ContextMenuConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  override uninstall({ global = false }: { global?: boolean }): void {
    // NOTE: don't uninstall the mouse/click handler because other context menus need it
    const extensions = this.extensions.splice(0, this.extensions.length);
    if (global) {
      for (const extension of extensions) {
        void uninstallContextMenu({ extensionId: extension.id });
      }
    }
  }

  removeExtensions(): void {
    // Don't need to do any cleanup since context menu registration is handled globally
  }

  async install(): Promise<boolean> {
    // Always install the mouse handler in case a context menu is added later
    installMouseHandlerOnce();
    const available = await this.isAvailable();
    await this.registerExtensions();
    return available;
  }

  override async defaultReader(): Promise<IReader> {
    return new ArrayCompositeReader([
      await this.getBaseReader(),
      new ContextMenuReader(),
    ]);
  }

  async ensureMenu(
    extension: Pick<
      ResolvedExtension<ContextMenuConfig>,
      "id" | "config" | "_deployment"
    >
  ): Promise<void> {
    const { title = "Untitled menu item" } = extension.config;

    // Check for null/undefined to preserve backward compatability
    if (!isDeploymentActive(extension)) {
      console.debug("Skipping ensureMenu for extension from paused deployment");
      return;
    }

    const patterns = compact(
      uniq([...this.documentUrlPatterns, ...(this.permissions?.origins ?? [])])
    );

    await ensureContextMenu({
      extensionId: extension.id,
      contexts: this.contexts ?? ["all"],
      title,
      documentUrlPatterns: patterns,
    });
  }

  private async registerExtensions(): Promise<void> {
    console.debug(
      "Registering",
      this.extensions.length,
      "contextMenu extension points"
    );

    const results = await Promise.allSettled(
      this.extensions.map(async (extension) => {
        try {
          await this.registerExtension(extension);
        } catch (error) {
          reportError(error, {
            deploymentId: extension._deployment?.id,
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          });
          throw error;
        }
      })
    );

    const numErrors = results.filter((x) => x.status === "rejected").length;
    if (numErrors > 0) {
      notify.error(
        `An error occurred adding ${numErrors} context menu item(s)`
      );
    }
  }

  decideReaderRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "legacy":
      case "eventTarget":
        return target;
      case "document":
        return document;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
    }
  }

  decidePipelineRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget":
        return target;
      case "legacy":
      case "document":
        return document;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
    }
  }

  private async registerExtension(
    extension: ResolvedExtension<ContextMenuConfig>
  ): Promise<void> {
    const { action: actionConfig } = extension.config;

    await this.ensureMenu(extension);

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    console.debug(
      "Register context menu handler for: %s (%s)",
      extension.id,
      extension.label ?? "No Label",
      {
        extension,
      }
    );

    registerHandler(extension.id, async (clickData) => {
      reportEvent("HandleContextMenu", selectEventData(extension));

      try {
        const reader = await this.getBaseReader();
        const serviceContext = await makeServiceContext(extension.services);

        const targetElement =
          clickedElement ?? guessSelectedElement() ?? document;

        const input = {
          ...(await reader.read(this.decideReaderRoot(targetElement))),
          // ClickData provides the data from schema defined above in ContextMenuReader
          ...clickData,
          // Add some additional data that people will generally want
          documentUrl: document.location.href,
        };

        const initialValues: InitialValues = {
          input,
          root: this.decidePipelineRoot(targetElement),
          serviceContext,
          optionsArgs: extension.optionsArgs,
        };

        await reduceExtensionPipeline(actionConfig, initialValues, {
          logger: extensionLogger,
          ...apiVersionOptions(extension.apiVersion),
        });
      } catch (error) {
        if (isErrorObject(error)) {
          reportError(error);
          extensionLogger.error(error);
        } else {
          extensionLogger.warn(error as any);
        }

        throw error;
      }
    });
  }

  async run(): Promise<void> {
    // Already taken care by the `install` method
  }
}

export interface MenuDefaultOptions {
  title?: string;
  [key: string]: string | string[];
}

export interface MenuDefinition extends ExtensionPointDefinition {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: ContextMenuTargetMode;
  defaultOptions?: MenuDefaultOptions;
}

class RemoteContextMenuExtensionPoint extends ContextMenuExtensionPoint {
  private readonly _definition: MenuDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly contexts: Menus.ContextType[];

  public readonly rawConfig: ExtensionPointConfig<MenuDefinition>;

  constructor(config: ExtensionPointConfig<MenuDefinition>) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(cloned.metadata, new BackgroundLogger());
    this._definition = cloned.definition;
    this.rawConfig = cloned;
    const { isAvailable, documentUrlPatterns, contexts } = cloned.definition;
    // If documentUrlPatterns not specified show everywhere
    this.documentUrlPatterns = castArray(documentUrlPatterns ?? ["*://*/*"]);
    this.contexts = castArray(contexts);
    this.permissions = {
      origins: isAvailable?.matchPatterns
        ? castArray(isAvailable.matchPatterns)
        : [],
    };
  }

  get targetMode(): ContextMenuTargetMode {
    // Default to "legacy" to match the legacy behavior
    return this._definition.targetMode ?? "legacy";
  }

  async isAvailable(): Promise<boolean> {
    if (
      !isEmpty(this._definition.isAvailable) &&
      (await checkAvailable(this._definition.isAvailable))
    ) {
      return true;
    }

    return checkAvailable({
      matchPatterns: this._definition.documentUrlPatterns,
    });
  }

  async getBaseReader() {
    return mergeReaders(this._definition.reader);
  }

  public override get defaultOptions(): {
    title: string;
    [key: string]: string | string[];
  } {
    return {
      title: "PixieBrix",
      ...this._definition.defaultOptions,
    };
  }
}

export function fromJS(
  config: ExtensionPointConfig<MenuDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "contextMenu") {
    throw new Error(`Expected type=contextMenu, got ${type}`);
  }

  return new RemoteContextMenuExtensionPoint(config);
}
