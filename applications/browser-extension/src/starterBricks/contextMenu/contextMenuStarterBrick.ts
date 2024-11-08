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

import {
  type InitialValues,
  reduceModComponentPipeline,
} from "@/runtime/reducePipeline";
import {
  type Manifest,
  type Menus,
  type Permissions,
} from "webextension-polyfill";
import ArrayCompositeReader from "@/bricks/readers/ArrayCompositeReader";
import {
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { castArray, cloneDeep, compact, isEmpty, pick, uniq } from "lodash";
import { checkAvailable } from "@/bricks/available";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { isDeploymentActive } from "@/utils/deploymentUtils";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import { guessSelectedElement } from "@/utils/selectionController";
import {
  ContextMenuReader,
  contextMenuReaderShim,
} from "@/starterBricks/contextMenu/contextMenuReader";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Schema } from "@/types/schemaTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import {
  type StarterBrick,
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import makeIntegrationContextFromDependencies from "@/integrations/util/makeIntegrationContextFromDependencies";
import pluralize from "@/utils/pluralize";
import { allSettled } from "@/utils/promiseUtils";
import batchedFunction from "batched-function";
import { onContextInvalidated } from "webext-events";
import type { PlatformCapability } from "@/platform/capabilities";
import { getPlatform } from "@/platform/platformContext";
import { getSettingsState } from "@/store/settings/settingsStorage";
import type { Except } from "type-fest";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { DEFAULT_ACTION_RESULTS } from "@/starterBricks/starterBrickConstants";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { initSelectionMenu } from "@/contentScript/textSelectionMenu/selectionMenuController";
import {
  type ContextMenuTargetMode,
  type ContextMenuConfig,
  type ContextMenuDefinition,
} from "@/starterBricks/contextMenu/contextMenuTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  getModComponentRef,
  mapModComponentToMessageContext,
} from "@/utils/modUtils";

const DEFAULT_MENU_ITEM_TITLE = "Untitled menu item";

const groupRegistrationErrorNotification = (platform: PlatformProtocol) =>
  batchedFunction(
    (errors: unknown[][]): void => {
      // `batchedFunction` will throttle the calls and coalesce all the errors into a
      // single notification, even if they come from different mod components
      // https://github.com/pixiebrix/pixiebrix-extension/issues/7353
      platform.toasts.showNotification({
        type: "error",
        message: `An error occurred adding ${pluralize(
          errors.flat().length,
          "$$ context menu item",
        )}`,
        reportError: false,
      });
    },
    {
      delay: 100,
    },
  );

/**
 * The element the user right-clicked on to trigger the context menu
 */
let clickedElement: HTMLElement | null = null;

function setActiveElement(event: MouseEvent): void {
  // This method can't throw, otherwise I think it breaks event dispatching because we're passing
  // useCapture: true to the event listener
  console.debug("Setting right-clicked element for contextMenu", {
    target: event.target,
  });
  clickedElement = event.target as HTMLElement;
}

function installMouseHandlerOnce(): void {
  // `addEventListener` natively avoids duplicate listeners
  document.addEventListener("contextmenu", setActiveElement, {
    // Handle it first in case a target beneath it cancels the event
    capture: true,
    // For performance, indicate we won't call preventDefault
    passive: true,
    // Remove after context invalidation
    signal: onContextInvalidated.signal,
  });
}

/**
 * See also: https://developer.chrome.com/extensions/contextMenus
 */
export abstract class ContextMenuStarterBrickABC extends StarterBrickABC<ContextMenuConfig> {
  public override get isSyncInstall() {
    return true;
  }

  abstract getBaseReader(): Promise<Reader>;

  abstract get targetMode(): ContextMenuTargetMode;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  abstract readonly contexts: Menus.ContextType[];

  public get kind(): StarterBrickType {
    return StarterBrickTypes.CONTEXT_MENU;
  }

  readonly capabilities: PlatformCapability[] = ["contextMenu"];

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
    ["title", "action"],
  );

  async getBricks(
    modComponent: HydratedModComponent<ContextMenuConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.action);
  }

  override uninstall({ global = false }: { global?: boolean }): void {
    // NOTE: don't uninstall the mouse/click handler because other context menus need it
    const modComponents = this.modComponents.splice(0);
    if (global) {
      for (const modComponent of modComponents) {
        void getPlatform().contextMenus.unregister(modComponent.id);
        getPlatform().textSelectionMenu.unregister(modComponent.id);
      }
    }
  }

  /**
   * Remove the context menu items for the given mod components from all tabs/contexts.
   * @see uninstallContextMenu
   * @see preloadContextMenus
   */
  clearModComponentInterfaceAndEvents(modComponentIds: UUID[]): void {
    // Context menus are registered with Chrome by document pattern via the background page. Therefore, it's impossible
    // to clear the UI menu item from a single tab. Calling `uninstallContextMenu` removes the tab from all menus.

    // Uninstalling context menus is the least-bad approach because it prevents duplicate menu item titles due to
    // re-activating a context menu (during re-activation, mod components get new modComponentIds.)

    for (const modComponentId of modComponentIds) {
      void getPlatform().contextMenus.unregister(modComponentId);
      getPlatform().textSelectionMenu.unregister(modComponentId);
    }
  }

  async install(): Promise<boolean> {
    // Always install the mouse handler in case a context menu is added later
    installMouseHandlerOnce();

    if (this.contexts.includes("selection") || this.contexts.includes("all")) {
      const { textSelectionMenu: isTextSelectionMenuEnabled } =
        await getSettingsState();

      if (isTextSelectionMenuEnabled) {
        initSelectionMenu();
      }
    }

    return this.isAvailable();
  }

  async runModComponents(): Promise<void> {
    await this.registerModComponents();
  }

  override async defaultReader(): Promise<Reader> {
    return new ArrayCompositeReader([
      await this.getBaseReader(),
      new ContextMenuReader(),
    ]);
  }

  override async previewReader(): Promise<Reader> {
    return new ArrayCompositeReader([
      await this.getBaseReader(),
      contextMenuReaderShim as unknown as Reader,
    ]);
  }

  async registerMenuItem(
    modComponent: Pick<
      HydratedModComponent<ContextMenuConfig>,
      "id" | "config" | "deploymentMetadata"
    >,
    handler: (clickData: Menus.OnClickData) => Promise<void>,
  ): Promise<void> {
    const { title = DEFAULT_MENU_ITEM_TITLE } = modComponent.config;

    if (!isDeploymentActive(modComponent)) {
      return;
    }

    const patterns = compact(
      uniq([...this.documentUrlPatterns, ...(this.permissions?.origins ?? [])]),
    );

    await getPlatform().contextMenus.register({
      modComponentId: modComponent.id,
      contexts: this.contexts ?? ["all"],
      title,
      documentUrlPatterns: patterns,
      handler,
    });
  }

  private async registerModComponents(): Promise<void> {
    console.debug(
      "Registering",
      this.modComponents.length,
      "contextMenu starter bricks",
    );

    const promises = this.modComponents.map(async (modComponent) => {
      try {
        await this.registerModComponentItem(modComponent);
      } catch (error) {
        reportError(error, {
          context: {
            deploymentId: modComponent.deploymentMetadata?.id,
            starterBrickId: modComponent.extensionPointId,
            modComponentId: modComponent.id,
          },
        });
        throw error;
      }
    });

    await allSettled(promises, {
      catch: groupRegistrationErrorNotification(this.platform),
    });
  }

  decideReaderRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "legacy":
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

  decidePipelineRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget": {
        return target;
      }

      case "legacy":
      case "document": {
        return document;
      }

      default: {
        const exhaustiveCheck: never = this.targetMode;
        throw new BusinessError(`Unknown targetMode: ${exhaustiveCheck}`);
      }
    }
  }

  private async registerModComponentItem(
    modComponent: HydratedModComponent<ContextMenuConfig>,
  ): Promise<void> {
    const {
      action: actionConfig,
      onSuccess = {},
      title = DEFAULT_MENU_ITEM_TITLE,
    } = modComponent.config;

    const modComponentLogger = this.logger.childLogger(
      mapModComponentToMessageContext(modComponent),
    );

    const handler = async (
      clickData: Except<
        Menus.OnClickData,
        "menuItemId" | "editable" | "modifiers"
      >,
    ): Promise<void> => {
      reportEvent(Events.HANDLE_CONTEXT_MENU, selectEventData(modComponent));

      try {
        const reader = await this.getBaseReader();
        const integrationContext = await makeIntegrationContextFromDependencies(
          modComponent.integrationDependencies,
        );

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
          integrationContext,
          optionsArgs: modComponent.optionsArgs,
        };

        await reduceModComponentPipeline(actionConfig, initialValues, {
          logger: modComponentLogger,
          modComponentRef: getModComponentRef(modComponent),
          ...apiVersionOptions(modComponent.apiVersion),
        });

        if (onSuccess) {
          if (typeof onSuccess === "boolean" && onSuccess) {
            this.platform.toasts.showNotification(
              DEFAULT_ACTION_RESULTS.success,
            );
          } else {
            this.platform.toasts.showNotification({
              ...DEFAULT_ACTION_RESULTS.success,
              ...pick(onSuccess, "message", "type"),
            });
          }
        }
      } catch (error) {
        if (hasSpecificErrorCause(error, CancelError)) {
          this.platform.toasts.showNotification(DEFAULT_ACTION_RESULTS.cancel);
        } else {
          modComponentLogger.error(error);
          this.platform.toasts.showNotification({
            ...DEFAULT_ACTION_RESULTS.error,
            error, // Include more details in the notification
            reportError: false,
          });
        }
      }
    };

    await this.registerMenuItem(modComponent, handler);

    getPlatform().textSelectionMenu.register(modComponent.id, {
      title,
      // Starter Brick current doesn't have an icon affordance because the browser context menu API doesn't support them
      icon: undefined,
      async handler(text: string) {
        return handler({ selectionText: text });
      },
    });
  }
}

class RemoteContextMenuStarterBrick extends ContextMenuStarterBrickABC {
  private readonly _definition: ContextMenuDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly contexts: Menus.ContextType[];

  public readonly rawConfig: StarterBrickDefinitionLike<ContextMenuDefinition>;

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<ContextMenuDefinition>,
  ) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    assertNotNullish(
      cloned.metadata,
      "metadata is required to create a starter brick",
    );

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
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<ContextMenuDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== StarterBrickTypes.CONTEXT_MENU) {
    throw new Error(`Expected type=contextMenu, got ${type}`);
  }

  return new RemoteContextMenuStarterBrick(platform, config);
}
