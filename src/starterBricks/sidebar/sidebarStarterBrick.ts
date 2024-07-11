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
  type CustomEventOptions,
  type DebounceOptions,
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { type Permissions } from "webextension-polyfill";
import { checkAvailable } from "@/bricks/available";
import Mustache from "mustache";
import { uuidv4 } from "@/types/helpers";
import { HeadlessModeError } from "@/bricks/errors";
import { shouldModComponentRunForStateChange } from "@/starterBricks/helpers";
import { cloneDeep, debounce, remove } from "lodash";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import { NoRendererError } from "@/errors/businessErrors";
import { serializeError } from "serialize-error";
import { type Schema } from "@/types/schemaTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type JsonObject } from "type-fest";
import { type UUID } from "@/types/stringTypes";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import {
  type StarterBrick,
  StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import { ReusableAbortController } from "abort-utils";
import type { PlatformCapability } from "@/platform/capabilities";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  type SidebarDefinition,
  type SidebarConfig,
  type Trigger,
} from "@/starterBricks/sidebar/sidebarStarterBrickTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { mapModComponentToMessageContext } from "@/utils/modUtils";

export abstract class SidebarStarterBrickABC extends StarterBrickABC<SidebarConfig> {
  abstract get trigger(): Trigger;

  /**
   * Options for the `custom` trigger, if applicable.
   */
  abstract get customTriggerOptions(): Nullishable<CustomEventOptions>;

  /**
   * Debounce options for the trigger.
   *
   * Since 1.8.2, debounce is applied per Mod Component to account for page state change events only applying to a
   * subset of the ModComponents.
   */
  abstract get debounceOptions(): Nullishable<DebounceOptions>;

  /**
   * Map from ModComponent to debounce refresh function, so each ModComponent can be debounced independently.
   */
  // Include ModComponent in the body so the method doesn't retain a reference to the ModComponent in the closure
  private readonly debouncedRefreshPanel = new Map<
    UUID,
    (
      modComponent: HydratedModComponent<SidebarConfig>,
    ) => Promise<void> | undefined
  >();

  readonly permissions: Permissions.Permissions = {};

  /**
   * Controller to drop all listeners and timers
   */
  private readonly abortController = new ReusableAbortController();

  inputSchema: Schema = propertiesToSchema(
    {
      heading: {
        type: "string",
        description: "The heading for the panel",
      },
      body: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/renderer#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
    },
    ["heading", "body"],
  );

  // Historical context: in the browser API, the toolbar icon is bound to an action. This is a panel that's shown
  // when the user toggles the toolbar icon. Hence: actionPanel.
  // See https://developer.chrome.com/docs/extensions/reference/browserAction/
  public get kind(): StarterBrickType {
    return StarterBrickTypes.SIDEBAR_PANEL;
  }

  readonly capabilities: PlatformCapability[] = ["panel"];

  async getBricks(
    modComponent: HydratedModComponent<SidebarConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.body);
  }

  clearModComponentInterfaceAndEvents(modComponentIds: UUID[]): void {
    this.platform.panels.removeComponents(modComponentIds);
  }

  public override uninstall(): void {
    const modComponents = this.modComponents.splice(0);
    this.clearModComponentInterfaceAndEvents(modComponents.map((x) => x.id));
    this.platform.panels.unregisterStarterBrick(this.id);
    console.debug(
      "SidebarStarterBrick:uninstall: stop listening for sidebarShowEvents",
    );
    this.platform.panels.showEvent.remove(this.runModComponents);
    this.cancelListeners();
  }

  /**
   * HACK: a version of uninstall that keeps the panel for mod component in the sidebar so the tab doesn't flicker
   * @param modComponentId the panel to preserve
   * @see uninstall
   */
  public HACK_uninstallExceptModComponent(modComponentId: UUID): void {
    // Don't call this.clearModComponentInterfaceAndEvents to keep the panel.
    // Instead, mutate this.modComponents to exclude id
    remove(this.modComponents, (x) => x.id === modComponentId);
    this.platform.panels.unregisterStarterBrick(this.id, {
      preserveModComponentIds: [modComponentId],
    });
    this.platform.panels.showEvent.remove(this.runModComponents);
  }

  private async runModComponent(
    readerContext: JsonObject,
    modComponent: HydratedModComponent<SidebarConfig>,
  ): Promise<void> {
    // Generate our own run id so that we know it (to pass to upsertPanel)
    const runId = uuidv4();

    const componentLogger = this.logger.childLogger(
      mapModComponentToMessageContext(modComponent),
    );

    const integrationsContext = await makeIntegrationsContextFromDependencies(
      modComponent.integrationDependencies,
    );
    const modComponentContext = { ...readerContext, ...integrationsContext };

    const { heading: rawHeading, body } = modComponent.config;

    const heading = Mustache.render(rawHeading, modComponentContext);

    this.platform.panels.updateHeading(modComponent.id, heading);

    const initialValues: InitialValues = {
      input: readerContext,
      optionsArgs: modComponent.optionsArgs,
      root: document,
      serviceContext: integrationsContext,
    };

    /**
     * Renderers need to be run with try-catch, catch the HeadlessModeError, and
     * use that to send the panel payload to the sidebar (or other target)
     * @see runRendererBlock
     * @see executeBlockWithValidatedProps
     *  starting on line 323, the runRendererPipeline() function
     */
    try {
      await reduceModComponentPipeline(body, initialValues, {
        headless: true,
        logger: componentLogger,
        ...apiVersionOptions(modComponent.apiVersion),
        runId,
      });
      // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
      // noinspection ExceptionCaughtLocallyJS
      throw new NoRendererError();
    } catch (error) {
      const modComponentRef = {
        modComponentId: modComponent.id,
        starterBrickId: this.id,
        modId: modComponent._recipe?.id,
      };

      const runMetadata = {
        runId,
        modComponentId: modComponent.id,
      };

      if (error instanceof HeadlessModeError) {
        this.platform.panels.upsertPanel(modComponentRef, heading, {
          brickId: error.brickId,
          key: uuidv4(),
          ctxt: error.ctxt,
          args: error.args,
          ...runMetadata,
        });
      } else {
        componentLogger.error(error);
        this.platform.panels.upsertPanel(modComponentRef, heading, {
          key: uuidv4(),
          error: serializeError(error),
          ...runMetadata,
        });
      }
    }
  }

  cancelListeners(): void {
    // Inform and remove registered listeners
    this.abortController.abortAndReset();
  }

  /**
   * Calculate/refresh the content for a single panel.
   * DO NOT CALL DIRECTLY
   * @see debouncedRefreshPanels
   */
  private async refreshComponentPanel(
    modComponent: HydratedModComponent<SidebarConfig>,
  ): Promise<void> {
    // Read per-panel, because panels might be debounced on different schedules.
    const reader = await this.defaultReader();
    const readerContext = await reader.read(document);

    try {
      await this.runModComponent(readerContext, modComponent);
    } catch (error) {
      this.logger
        .childLogger({
          deploymentId: modComponent._deployment?.id,
          modId: modComponent._recipe?.id,
          modComponentId: modComponent.id,
        })
        .error(error);
    }
  }

  /**
   * Run/refresh the specified mod components, debouncing if applicable.
   * @param componentsToRun the mod components to run
   */
  private async debouncedRefreshPanels(
    componentsToRun: Array<HydratedModComponent<SidebarConfig>>,
  ): Promise<void> {
    // Order doesn't matter because panel positions are already reserved
    await Promise.all(
      componentsToRun.map(async (modComponent) => {
        if (this.debounceOptions?.waitMillis) {
          const { waitMillis, ...options } = this.debounceOptions;

          let debounced = this.debouncedRefreshPanel.get(modComponent.id);

          if (debounced) {
            await debounced(modComponent);
          } else {
            // ModComponents are debounced on separate schedules because some ModComponents may ignore certain events
            // for performance (e.g., ModComponents ignore state change events from other mods.)
            debounced = debounce(
              async (x: HydratedModComponent<SidebarConfig>) =>
                this.refreshComponentPanel(x),
              waitMillis,
              options,
            );
            this.debouncedRefreshPanel.set(modComponent.id, debounced);

            // On the first run, run immediately so that the panel doesn't show a loading indicator during the
            // debounce interval
            await this.refreshComponentPanel(modComponent);
          }
        } else {
          await this.refreshComponentPanel(modComponent);
        }
      }),
    );
  }

  /**
   * Shared event handler for DOM event triggers.
   * It's bound to this instance so that it can be removed when the mod is deactivated.
   */
  private readonly eventHandler = async (event: Event): Promise<void> => {
    let relevantModComponents;

    switch (this.trigger) {
      case "statechange": {
        // For performance, only run mod components that could be impacted by the state change.
        // Perform the check _before_ debounce, so that the debounce timer is not impacted by state from other mods.
        // See https://github.com/pixiebrix/pixiebrix-extension/issues/6804 for more details/considerations.
        relevantModComponents = this.modComponents.filter((modComponent) =>
          shouldModComponentRunForStateChange(modComponent, event),
        );
        break;
      }

      default: {
        relevantModComponents = this.modComponents;
        break;
      }
    }

    await this.debouncedRefreshPanels(relevantModComponents);
  };

  private attachEventTrigger(eventName: string): void {
    document.addEventListener(eventName, this.eventHandler, {
      signal: this.abortController.signal,
    });
  }

  // Use arrow syntax to avoid having to bind when passing as an event listener
  runModComponents = async ({ reason }: RunArgs): Promise<void> => {
    if (!(await this.isAvailable())) {
      console.debug(
        "SidebarStarterBrick:run calling sidebarController:removeExtensionPoint because StarterBrick is not available for URL",
        this.id,
      );

      // Keep sidebar entries up-to-date regardless of trigger policy
      this.platform.panels.unregisterStarterBrick(this.id);
      return;
    }

    if (this.modComponents.length === 0) {
      console.debug(
        "SidebarStarterBrick:run Sidebar StarterBrick %s has no installed mod components",
        this.id,
      );

      return;
    }

    // Reserve placeholders in the sidebar for when it becomes visible. `Run` is called from lifecycle.ts on navigation;
    // the sidebar won't be visible yet on initial page load.
    this.platform.panels.reservePanels(
      this.modComponents.map((modComponent) => ({
        modComponentId: modComponent.id,
        starterBrickId: this.id,
        modId: modComponent._recipe?.id,
      })),
    );

    if (!(await this.platform.panels.isContainerVisible())) {
      console.debug(
        "SidebarStarterBrick:run Skipping run for %s because sidebar is not visible",
        this.id,
      );
      return;
    }

    // On the initial run or a manual run, run directly
    if (
      this.trigger === "load" ||
      [
        RunReason.MANUAL,
        RunReason.INITIAL_LOAD,
        RunReason.PAGE_EDITOR,
      ].includes(reason)
    ) {
      void this.debouncedRefreshPanels(this.modComponents);
    }

    if (this.trigger === "selectionchange" || this.trigger === "statechange") {
      this.attachEventTrigger(this.trigger);
    } else if (
      this.trigger === "custom" &&
      this.customTriggerOptions?.eventName
    ) {
      this.attachEventTrigger(this.customTriggerOptions?.eventName);
    }
  };

  async install(): Promise<boolean> {
    const available = await this.isAvailable();

    if (available) {
      // Strictly speaking, the `install` method should not add components to the page. However, for sidebar panel,
      // there's a race condition between the install and runComponents call on initial page load if the user
      // clicks the browser action too quickly.
      // Reserve the panels, to ensure the sidebarController knows about them prior to the sidebar showing. This is to
      // avoid a race condition with the position of the home tab in the sidebar.
      // In the future, we might instead consider gating sidebar content loading based on mods both having been
      // `install`ed and `runComponents` called completed at least once.
      this.platform.panels.reservePanels(
        this.modComponents.map((components) => ({
          modComponentId: components.id,
          starterBrickId: this.id,
          modId: components._recipe?.id,
        })),
      );

      // Add event listener so content for the panel is calculated/loaded when the sidebar opens
      console.debug(
        "SidebarStarterBrick:install: listen for sidebarShowEvents",
      );

      this.platform.panels.showEvent.add(this.runModComponents, {
        passive: true,
      });
    } else {
      this.platform.panels.unregisterStarterBrick(this.id);
    }

    return available;
  }
}

class RemotePanelStarterBrick extends SidebarStarterBrickABC {
  private readonly definition: SidebarDefinition;

  public readonly rawConfig: StarterBrickDefinitionLike;

  constructor(platform: PlatformProtocol, config: StarterBrickDefinitionLike) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    assertNotNullish(
      cloned.metadata,
      "metadata is required to create a starter brick",
    );
    super(platform, cloned.metadata);
    this.rawConfig = cloned;
    this.definition = cloned.definition;
  }

  public override get isSyncInstall() {
    // Panels must be reserved for the page to be considered ready. Otherwise, there are race conditions with whether
    // the sidebar panels have been reserved by the time the user clicks the browserAction.
    return true;
  }

  override async defaultReader(): Promise<Reader> {
    return mergeReaders(this.definition.reader);
  }

  get debounceOptions(): Nullishable<DebounceOptions> {
    return this.definition.debounce;
  }

  get customTriggerOptions(): Nullishable<CustomEventOptions> {
    return this.definition.customEvent;
  }

  get trigger(): Trigger {
    // Default to load for backward compatability
    return this.definition.trigger ?? "load";
  }

  async isAvailable(): Promise<boolean> {
    // Persistent sidebar panels are not available in iframes. They should be installed on the top frame.
    return !isLoadedInIframe() && checkAvailable(this.definition.isAvailable);
  }
}

export function fromJS(
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike,
): StarterBrick {
  const { type } = config.definition;
  if (type !== StarterBrickTypes.SIDEBAR_PANEL) {
    throw new Error(`Expected type=actionPanel, got ${type}`);
  }

  return new RemotePanelStarterBrick(platform, config);
}
