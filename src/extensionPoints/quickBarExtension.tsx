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

import React from "react";
import {
  InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import {
  IBlock,
  IconConfig,
  IExtensionPoint,
  IReader,
  ResolvedExtension,
  Schema,
  UUID,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { Manifest, Menus, Permissions } from "webextension-polyfill";
import {
  ExtensionPoint,
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { castArray, cloneDeep, isEmpty } from "lodash";
import { checkAvailable, testMatchPatterns } from "@/blocks/available";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import notify, {
  DEFAULT_ACTION_RESULTS,
  showNotification,
} from "@/utils/notify";
import { reportEvent } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { makeServiceContext } from "@/services/serviceUtils";
import { initQuickBarApp } from "@/components/quickBar/QuickBarApp";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import { guessSelectedElement } from "@/utils/selectionController";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { BusinessError, CancelError } from "@/errors/businessErrors";

export type QuickBarTargetMode = "document" | "eventTarget";

export type QuickBarConfig = {
  /**
   * The title to show in the Quick Bar
   */
  title: string;

  /**
   * (Optional) the icon to show in the Quick Bar
   */
  icon?: IconConfig;

  action: BlockConfig | BlockPipeline;
};

export abstract class QuickBarExtensionPoint extends ExtensionPoint<QuickBarConfig> {
  static isQuickBarExtensionPoint(
    extensionPoint: IExtensionPoint
  ): extensionPoint is QuickBarExtensionPoint {
    // Need to a access a type specific property (QuickBarExtensionPoint._definition) on a base-typed entity (IExtensionPoint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (extensionPoint as any)?._definition?.type === "quickBar";
  }

  abstract get targetMode(): QuickBarTargetMode;

  abstract getBaseReader(): Promise<IReader>;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  abstract readonly contexts: Menus.ContextType[];

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description:
          "The text to display in the item. When the context is selection, use %s within the string to show the selected text.",
      },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
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
    extension: ResolvedExtension<QuickBarConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  public get kind(): "quickBar" {
    return "quickBar";
  }

  override uninstall(): void {
    quickBarRegistry.removeExtensionPointActions(this.id);
  }

  removeExtensions(extensionIds: UUID[]): void {
    for (const extensionId of extensionIds) {
      quickBarRegistry.remove(extensionId);
    }
  }

  async install(): Promise<boolean> {
    initQuickBarApp();
    // Like for context menus, the match patterns for quick bar control which pages the extension point requires early
    // access to (so PixieBrix will ask for permissions). Whether a quick bar item actually appears is controlled by the
    // documentUrlPatterns.
    return true;
  }

  override async defaultReader(): Promise<IReader> {
    return this.getBaseReader();
  }

  decideRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget":
        return target;
      case "document":
        return document;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
    }
  }

  private async syncActionsForUrl(): Promise<void> {
    // Remove any actions that were available on the previous navigation, but are no longer available
    if (!testMatchPatterns(this.documentUrlPatterns)) {
      quickBarRegistry.removeExtensionPointActions(this.id);
      return;
    }

    const results = await Promise.allSettled(
      this.extensions.map(async (extension) => {
        try {
          await this.registerExtensionAction(extension);
        } catch (error) {
          reportError(error, selectEventData(extension));
          throw error;
        }
      })
    );

    const numErrors = results.filter((x) => x.status === "rejected").length;
    if (numErrors > 0) {
      notify.error(`An error occurred adding ${numErrors} quick bar items(s)`);
    }
  }

  /**
   * Add a QuickBar action for extension
   * @private
   */
  private async registerExtensionAction(
    extension: ResolvedExtension<QuickBarConfig>
  ): Promise<void> {
    const {
      title: name,
      action: actionConfig,
      icon: iconConfig,
    } = extension.config;

    const icon = iconConfig ? (
      <Icon icon={iconConfig.id} library={iconConfig.library} />
    ) : (
      <Icon />
    ); // Defaults to a box

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    quickBarRegistry.add({
      id: extension.id,
      extensionPointId: this.id,
      name,
      icon,
      perform: async () => {
        reportEvent("HandleQuickBar", selectEventData(extension));

        try {
          const reader = await this.getBaseReader();
          const serviceContext = await makeServiceContext(extension.services);

          const targetElement = guessSelectedElement() ?? document;

          const input = {
            ...(await reader.read(this.decideRoot(targetElement))),
            // Add some additional data that people will generally want
            documentUrl: document.location.href,
          };

          const initialValues: InitialValues = {
            input,
            root: this.decideRoot(targetElement),
            serviceContext,
            optionsArgs: extension.optionsArgs,
          };

          await reduceExtensionPipeline(actionConfig, initialValues, {
            logger: extensionLogger,
            ...apiVersionOptions(extension.apiVersion),
          });
        } catch (error) {
          if (hasSpecificErrorCause(error, CancelError)) {
            showNotification(DEFAULT_ACTION_RESULTS.cancel);
          } else {
            extensionLogger.error(error);
            showNotification(DEFAULT_ACTION_RESULTS.error);
          }
        }
      },
    });

    console.debug(
      "Register quick bar action handler for: %s (%s)",
      extension.id,
      extension.label ?? "No Label",
      {
        extension,
      }
    );
  }

  async run(): Promise<void> {
    if (this.extensions.length === 0) {
      console.debug(
        `quickBar extension point ${this.id} has no installed extensions`
      );
      // Not sure if this is needed or not, but remove any straggler extension actions
      quickBarRegistry.removeExtensionPointActions(this.id);
      return;
    }

    await this.syncActionsForUrl();
  }
}

export type QuickBarDefaultOptions = {
  title?: string;
  [key: string]: string | string[];
};

export interface QuickBarDefinition extends ExtensionPointDefinition {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: QuickBarTargetMode;
  defaultOptions?: QuickBarDefaultOptions;
}

class RemoteQuickBarExtensionPoint extends QuickBarExtensionPoint {
  private readonly _definition: QuickBarDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly contexts: Menus.ContextType[];

  public readonly rawConfig: ExtensionPointConfig<QuickBarDefinition>;

  constructor(config: ExtensionPointConfig<QuickBarDefinition>) {
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

  get targetMode(): QuickBarTargetMode {
    return this._definition.targetMode ?? "eventTarget";
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
  config: ExtensionPointConfig<QuickBarDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "quickBar") {
    throw new Error(`Expected type=quickBar, got ${type}`);
  }

  return new RemoteQuickBarExtensionPoint(config);
}
