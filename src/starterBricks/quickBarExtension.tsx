/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  type InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import { propertiesToSchema } from "@/validators/generic";
import {
  type Manifest,
  type Menus,
  type Permissions,
} from "webextension-polyfill";
import {
  StarterBrickABC,
  type StarterBrickConfig,
  type StarterBrickDefinition,
} from "@/starterBricks/types";
import { castArray, cloneDeep, isEmpty } from "lodash";
import { checkAvailable, testMatchPatterns } from "@/bricks/available";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import notify, {
  DEFAULT_ACTION_RESULTS,
  showNotification,
} from "@/utils/notify";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { selectExtensionContext } from "@/starterBricks/helpers";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { selectAllBlocks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import { makeServiceContext } from "@/services/serviceUtils";
import { initQuickBarApp } from "@/components/quickBar/QuickBarApp";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import { guessSelectedElement } from "@/utils/selectionController";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { type IconConfig } from "@/types/iconTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Schema } from "@/types/schemaTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type UUID } from "@/types/stringTypes";

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

  action: BrickConfig | BrickPipeline;
};

export abstract class QuickBarStarterBrickABC extends StarterBrickABC<QuickBarConfig> {
  static isQuickBarExtensionPoint(
    extensionPoint: StarterBrick
  ): extensionPoint is QuickBarStarterBrickABC {
    // Need to a access a type specific property (QuickBarExtensionPoint._definition) on a base-typed entity (StarterBrick)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (extensionPoint as any)?._definition?.type === "quickBar";
  }

  abstract get targetMode(): QuickBarTargetMode;

  abstract getBaseReader(): Promise<Reader>;

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
    extension: ResolvedModComponent<QuickBarConfig>
  ): Promise<Brick[]> {
    return selectAllBlocks(extension.config.action);
  }

  public get kind(): "quickBar" {
    return "quickBar";
  }

  override uninstall(): void {
    quickBarRegistry.removeExtensionPointActions(this.id);
  }

  clearExtensionInterfaceAndEvents(extensionIds: UUID[]): void {
    for (const extensionId of extensionIds) {
      quickBarRegistry.removeAction(extensionId);
    }
  }

  async install(): Promise<boolean> {
    initQuickBarApp();
    // Like for context menus, the match patterns for quick bar control which pages the extension point requires early
    // access to (so PixieBrix will ask for permissions). Whether a quick bar item actually appears is controlled by the
    // documentUrlPatterns.
    return true;
  }

  override async defaultReader(): Promise<Reader> {
    return this.getBaseReader();
  }

  decideRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget": {
        return target;
      }

      case "document": {
        return document;
      }

      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
      }
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
    extension: ResolvedModComponent<QuickBarConfig>
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

    quickBarRegistry.addAction({
      id: extension.id,
      extensionPointId: this.id,
      name,
      icon,
      perform: async () => {
        reportEvent(Events.HANDLE_QUICK_BAR, selectEventData(extension));

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

export interface QuickBarDefinition extends StarterBrickDefinition {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: QuickBarTargetMode;
  defaultOptions?: QuickBarDefaultOptions;
}

export class RemoteQuickBarExtensionPoint extends QuickBarStarterBrickABC {
  private readonly _definition: QuickBarDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly contexts: Menus.ContextType[];

  public readonly rawConfig: StarterBrickConfig<QuickBarDefinition>;

  constructor(config: StarterBrickConfig<QuickBarDefinition>) {
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
  config: StarterBrickConfig<QuickBarDefinition>
): StarterBrick {
  const { type } = config.definition;
  if (type !== "quickBar") {
    throw new Error(`Expected type=quickBar, got ${type}`);
  }

  return new RemoteQuickBarExtensionPoint(config);
}
