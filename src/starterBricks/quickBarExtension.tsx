/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { selectExtensionContext } from "@/starterBricks/helpers";
import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import { guessSelectedElement } from "@/utils/selectionController";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { type IconConfig } from "@/types/iconTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Schema } from "@/types/schemaTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type UUID } from "@/types/stringTypes";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import makeServiceContextFromDependencies from "@/integrations/util/makeServiceContextFromDependencies";
import pluralize from "@/utils/pluralize";
import { allSettled } from "@/utils/promiseUtils";
import type { PlatformCapability } from "@/platform/capabilities";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { DEFAULT_ACTION_RESULTS } from "@/starterBricks/starterBrickConstants";
import { propertiesToSchema } from "@/utils/schemaUtils";

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
    extensionPoint: StarterBrick,
  ): extensionPoint is QuickBarStarterBrickABC {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any
    -- Need to a access a type specific property (QuickBarExtensionPoint._definition) on a base-typed entity (StarterBrick) */
    return (extensionPoint as any)?._definition?.type === "quickBar";
  }

  abstract get targetMode(): QuickBarTargetMode;

  abstract getBaseReader(): Promise<Reader>;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  abstract readonly contexts: Menus.ContextType[];

  readonly capabilities: PlatformCapability[] = ["quickBar"];

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
    ["title", "action"],
  );

  async getBricks(
    extension: ResolvedModComponent<QuickBarConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(extension.config.action);
  }

  public get kind(): "quickBar" {
    return "quickBar";
  }

  override uninstall(): void {
    quickBarRegistry.removeExtensionPointActions(this.id);
  }

  clearModComponentInterfaceAndEvents(extensionIds: UUID[]): void {
    for (const extensionId of extensionIds) {
      quickBarRegistry.removeAction(extensionId);
    }
  }

  async install(): Promise<boolean> {
    const { initQuickBarApp } = await import(
      /* webpackChunkName: "quickBarApp" */
      "@/components/quickBar/QuickBarApp"
    );

    await initQuickBarApp();
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
        const exhaustiveCheck: never = this.targetMode;
        throw new BusinessError(`Unknown targetMode: ${exhaustiveCheck}`);
      }
    }
  }

  private async syncActionsForUrl(): Promise<void> {
    // Remove any actions that were available on the previous navigation, but are no longer available
    if (!testMatchPatterns(this.documentUrlPatterns)) {
      quickBarRegistry.removeExtensionPointActions(this.id);
      return;
    }

    const promises = this.modComponents.map(async (extension) => {
      try {
        await this.registerExtensionAction(extension);
      } catch (error) {
        reportError(error, selectEventData(extension));
        throw error;
      }
    });

    await allSettled(promises, {
      catch: (errors) => {
        this.platform.toasts.showNotification({
          type: "error",
          message: `An error occurred adding ${pluralize(
            errors.length,
            "$$ quick bar item",
          )}`,
        });
      },
    });
  }

  /**
   * Add a QuickBar action for extension
   * @private
   */
  private async registerExtensionAction(
    extension: ResolvedModComponent<QuickBarConfig>,
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
      selectExtensionContext(extension),
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
          const serviceContext = await makeServiceContextFromDependencies(
            extension.integrationDependencies,
          );

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
            this.platform.toasts.showNotification(
              DEFAULT_ACTION_RESULTS.cancel,
            );
          } else {
            extensionLogger.error(error);
            this.platform.toasts.showNotification({
              ...DEFAULT_ACTION_RESULTS.error,
              error, // Include more details in the notification
              reportError: false,
            });
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
      },
    );
  }

  async runModComponents(): Promise<void> {
    if (this.modComponents.length === 0) {
      console.debug(
        `quickBar extension point ${this.id} has no installed extensions`,
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

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickConfig<QuickBarDefinition>,
  ) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(platform, cloned.metadata);
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
    // The quick bar lives on the top-level frame. So any actions contributed will never be visible
    if (isLoadedInIframe()) {
      return false;
    }

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
  platform: PlatformProtocol,
  config: StarterBrickConfig<QuickBarDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== "quickBar") {
    throw new Error(`Expected type=quickBar, got ${type}`);
  }

  return new RemoteQuickBarExtensionPoint(platform, config);
}
