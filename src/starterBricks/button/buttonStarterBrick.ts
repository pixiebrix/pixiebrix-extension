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

import { uuidv4 } from "@/types/helpers";
import { checkAvailable } from "@/bricks/available";
import { castArray, cloneDeep, debounce, pick } from "lodash";
import {
  type InitialValues,
  reduceModComponentPipeline,
  reducePipeline,
} from "@/runtime/reducePipeline";
import { hasSpecificErrorCause } from "@/errors/errorHelpers";
import {
  acquireElement,
  awaitElementOnce,
  onNodeRemoved,
  selectModComponentContext,
} from "@/starterBricks/helpers";
import {
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { type Metadata } from "@/types/registryTypes";
import { type Permissions } from "webextension-polyfill";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { getNavigationId } from "@/contentScript/context";
import getSvgIcon from "@/icons/getSvgIcon";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions, {
  DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
} from "@/runtime/apiVersionOptions";
import { engineRenderer } from "@/runtime/renderers";
import { mapArgs } from "@/runtime/mapArgs";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import sanitize from "@/utils/sanitize";
import { EXTENSION_POINT_DATA_ATTR } from "@/domConstants";
import reportError from "@/telemetry/reportError";
import pluralize from "@/utils/pluralize";
import {
  BusinessError,
  CancelError,
  MultipleElementsFoundError,
  NoElementsFoundError,
} from "@/errors/businessErrors";
import { PromiseCancelled } from "@/errors/genericErrors";
import { rejectOnCancelled } from "@/errors/rejectOnCancelled";
import { type Schema } from "@/types/schemaTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type JsonObject } from "type-fest";
import {
  type RunArgs,
  RunReason,
  type SelectorRoot,
} from "@/types/runtimeTypes";
import {
  type StarterBrick,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import initialize from "@/vendors/jQueryInitialize";
import { $safeFind } from "@/utils/domUtils";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import { ReusableAbortController, onAbort } from "abort-utils";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { DEFAULT_ACTION_RESULTS } from "@/starterBricks/starterBrickConstants";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  type ButtonStarterBrickConfig,
  type AttachMode,
  type ButtonDefinition,
  type ButtonTargetMode,
} from "@/starterBricks/button/buttonStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

const DATA_ATTR = "data-pb-uuid";

const BUTTON_INSTALL_ERROR_DEBOUNCE_MS = 1000;

/**
 * Nominal type for a button container nonce.
 */
type ContainerNonce = UUID & {
  _containerNonceBrand: never;
};

const actionSchema: Schema = {
  oneOf: [
    { $ref: "https://app.pixiebrix.com/schemas/effect#" },
    {
      type: "array",
      items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
    },
  ],
} as const;

async function cancelOnNavigation<T>(promise: Promise<T>): Promise<T> {
  // XXX: should introduce abortable promises listening for navigation vs. checking functions that compares
  // navigation IDs. For example, see lifecycle.ts:_navigationListeners
  const startNavigationId = getNavigationId();
  const isNavigationCancelled = () => getNavigationId() !== startNavigationId;
  return rejectOnCancelled(promise, isNavigationCancelled);
}

export abstract class ButtonStarterBrickABC extends StarterBrickABC<ButtonStarterBrickConfig> {
  /**
   * Mapping of button container nonce UUID to the DOM element for the button container
   */
  // XXX: does this need to be a WeakMap to prevent memory leaks? But won't be able to enumerate
  protected readonly containers: Map<ContainerNonce, HTMLElement>;

  /**
   * Set of button container UUIDs that have been removed from the DOM. Track so we know which ones we've already
   * taken action on to attempt to reacquire a button container.
   */
  private readonly removed: Set<ContainerNonce>;

  /**
   * Set of methods to call to cancel any DOM watchers associated with this starter brick
   */
  private readonly cancelController = new ReusableAbortController();

  /**
   * True if the starter brick has been uninstalled
   */
  private uninstalled = false;

  /**
   * Mapping from component id to the set of buttons that have been clicked and still running.
   * @see ButtonStarterBrickConfig.synchronous
   */
  private readonly runningModComponentPageElements = new Map<
    UUID,
    WeakSet<HTMLElement>
  >();

  private readonly notifyError = debounce(
    (payload: Parameters<PlatformProtocol["toasts"]["showNotification"]>[0]) =>
      this.platform.toasts.showNotification({
        type: "error",
        ...payload,
      }),
    BUTTON_INSTALL_ERROR_DEBOUNCE_MS,
    {
      leading: true,
      trailing: false,
    },
  ) as PlatformProtocol["toasts"]["showNotification"]; // `debounce` loses the overloads

  public get kind(): typeof StarterBrickTypes.BUTTON {
    return StarterBrickTypes.BUTTON;
  }

  readonly capabilities: PlatformCapability[] = CONTENT_SCRIPT_CAPABILITIES;

  public abstract get targetMode(): ButtonTargetMode;

  public abstract get attachMode(): AttachMode;

  public override get defaultOptions(): { caption: string } {
    return { caption: "Custom Button" };
  }

  protected constructor(platform: PlatformProtocol, metadata: Metadata) {
    super(platform, metadata);
    this.containers = new Map<ContainerNonce, HTMLElement>();
    this.removed = new Set<ContainerNonce>();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      caption: {
        type: "string",
        description: "The caption for the button.",
      },
      dynamicCaption: {
        type: "boolean",
        description: "True if the caption can refer to data from the reader",
        default: "false",
      },
      if: actionSchema,
      action: actionSchema,
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
      shadowDOM: {
        type: "object",
        description: "When provided, renders the button using the shadowDOM",
        properties: {
          tag: {
            type: "string",
          },
          mode: {
            type: "string",
            enum: ["open", "closed"],
            default: "closed",
          },
        },
        required: ["tag"],
      },
    },
    ["caption", "action"],
  );

  private cancelAllPending(): void {
    console.debug("Cancelling buttonStarterBrick observers");
    this.cancelController.abortAndReset();
  }

  clearModComponentInterfaceAndEvents(modComponentIds: UUID[]): void {
    console.debug("Remove componentIds for button starter brick: %s", this.id, {
      modComponentIds,
    });
    // Can't use this.containers.values() here b/c because it may have already been cleared
    for (const modComponentId of modComponentIds) {
      const $button = $safeFind(`[${DATA_ATTR}="${modComponentId}"]`);
      if ($button.length === 0) {
        console.warn(`Button for ${modComponentId} was not found`);
      }

      $button.remove();
    }
  }

  public override uninstall(): void {
    this.uninstalled = true;

    const containers = [...this.containers.values()];

    // Clear so they don't get re-added by the onNodeRemoved mechanism
    const modComponents = this.modComponents.splice(0);
    this.containers.clear();

    if (modComponents.length === 0) {
      console.warn(
        `uninstall called on button starter brick with no mod components: ${this.id}`,
      );
    }

    console.debug(
      `Uninstalling ${containers.length} buttons for ${modComponents.length} mod components`,
    );

    this.cancelAllPending();

    for (const container of containers) {
      try {
        this.clearModComponentInterfaceAndEvents(
          modComponents.map((x) => x.id),
        );
        // Release the button container element
        container.removeAttribute(EXTENSION_POINT_DATA_ATTR);
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  /**
   * Returns the selector root for bricks attached to the button.
   * @param $buttonElement the element that triggered the button
   */
  abstract getPipelineRoot($buttonElement: JQuery): SelectorRoot;

  /**
   * Returns the selector root provided to the reader.
   */
  abstract getReaderRoot({
    $containerElement,
    $buttonElement,
  }: {
    $containerElement: JQuery;
    $buttonElement: JQuery | null;
  }): SelectorRoot;

  abstract getTemplate(): string;

  abstract getContainerSelector(): string | string[];

  addButton($container: JQuery, $button: JQuery): void {
    $container.append($button);
  }

  async getBricks(
    modComponent: HydratedModComponent<ButtonStarterBrickConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.action);
  }

  /**
   * Callback when a button is removed from the page to wait to re-install the button if the container is re-added.
   * Used to handle SPA page transitions that don't navigate (e.g., modals, tabs, etc.)
   * @param containerNonce the container nonce generated in attachButtons
   */
  private async reacquire(containerNonce: ContainerNonce): Promise<void> {
    if (this.attachMode === "watch") {
      throw new Error("reacquire should not be called in watch mode");
    }

    if (this.uninstalled) {
      console.warn(
        `${this.instanceNonce}: cannot reacquire because mod component ${this.id} is destroyed`,
      );
      return;
    }

    const alreadyRemoved = this.removed.has(containerNonce);
    this.removed.add(containerNonce);
    if (alreadyRemoved) {
      console.warn(
        `${this.instanceNonce}: button container ${containerNonce} removed from DOM multiple times for ${this.id}`,
      );
    } else {
      console.debug(
        `${this.instanceNonce}: button container ${containerNonce} removed from DOM for ${this.id}`,
      );
      this.containers.delete(containerNonce);
      // Re-install the button containers (will wait for the container selector to re-appear if there's no copies of it
      // on the page) The behavior for multiple buttons is quirky here for "once" attachMode. There's a corner case
      // where 1) if one button is removed, 2) the containers are re-added immediately, 3) PixieBrix stops watching for
      // new buttons
      await this.waitAttachButtonContainers();
      await this.runModComponents({ reason: RunReason.MUTATION });
    }
  }

  /**
   * Attach starter brick to the provided button containers.
   */
  private attachButtons($buttonContainers: JQuery): void {
    const existingContainers = new Set(this.containers.values());

    for (const buttonContainer of $buttonContainers) {
      // Only acquire new button containers, otherwise we end up with duplicate entries in this.containers which causes
      // repeat evaluation of buttons in this.run
      if (!existingContainers.has(buttonContainer)) {
        const containerNonce = uuidv4() as ContainerNonce;
        this.containers.set(containerNonce, buttonContainer);

        const acquired = acquireElement(buttonContainer, this.id);

        if (acquired && this.attachMode === "once") {
          // Only re-acquire in "once" attachMode. In "watch" the button  will automatically be re-acquired when the
          // button container is re-initialized on the page
          onNodeRemoved(
            buttonContainer,
            async () => this.reacquire(containerNonce),
            this.cancelController.signal,
          );
        }
      }
    }
  }

  /**
   * Watch for new button containers to appear on the screen, e.g., due to SPA page transition, infinite scroll, etc.
   */
  private watchButtonContainers(): void {
    const containerSelector = this.getContainerSelector();

    if (typeof containerSelector !== "string") {
      throw new BusinessError(
        "Array of container selectors not supported for attachMode: 'watch'",
      );
    }

    // Watch for new containers on the page on the page
    const mutationObserver = initialize(
      containerSelector,
      (_index, container) => {
        this.attachButtons($(container as HTMLElement));
        void this.runModComponents({ reason: RunReason.MUTATION });
      },
      // `target` is a required option. Would it be possible to scope if the selector is nested? Would have to consider
      // commas in the selector. E.g., revert back to document if there's a comma
      { target: document },
    );

    onAbort(this.cancelController.signal, mutationObserver);
  }

  /**
   * Find and claim the new button containers currently on the page for the starter brick.
   * @returns true iff one or more button containers were found
   */
  private async waitAttachButtonContainers(): Promise<boolean> {
    if (this.uninstalled) {
      console.error("Button starter brick is uninstalled", {
        starerBrickNonce: this.instanceNonce,
      });
      throw new Error(
        "Cannot install button because starter brick was uninstalled",
      );
    }

    const containerSelector = this.getContainerSelector();

    console.debug(
      `${this.instanceNonce}: awaiting button container for ${this.id}`,
      {
        selector: containerSelector,
      },
    );

    const buttonContainerPromise = awaitElementOnce(
      containerSelector,
      this.cancelController.signal,
    );

    let $buttonContainers;

    try {
      $buttonContainers = (await cancelOnNavigation(
        buttonContainerPromise,
      )) as JQuery;
    } catch (error) {
      console.debug(
        `${this.instanceNonce}: stopped awaiting button container for ${this.id}`,
        { error },
      );
      throw error;
    }

    this.attachButtons($buttonContainers);

    if (this.attachMode === "watch") {
      this.watchButtonContainers();
    }

    return this.containers.size > 0;
  }

  async install(): Promise<boolean> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return false;
    }

    return this.waitAttachButtonContainers();
  }

  protected abstract makeButton(
    html: string,
    modComponent: HydratedModComponent<ButtonStarterBrickConfig>,
  ): JQuery;

  private async runModComponent(
    buttonContainer: HTMLElement,
    ctxtPromise: Promise<JsonObject> | undefined,
    modComponent: HydratedModComponent<ButtonStarterBrickConfig>,
  ) {
    if (!modComponent.id) {
      this.logger.error(`Refusing to run mod without id for ${this.id}`);
      return;
    }

    const modComponentLogger = this.logger.childLogger(
      selectModComponentContext(modComponent),
    );

    console.debug(
      `${this.instanceNonce}: running button mod component ${modComponent.id}`,
    );

    // Safe because button is an HTMLElement, not a string
    const $buttonContainer = $(buttonContainer);

    const {
      caption,
      dynamicCaption = false,
      action: actionConfig,
      onCancel = {},
      onError = {},
      onSuccess = {},
      icon = { id: "box", size: 18 },
      synchronous,
    } = modComponent.config;

    const versionOptions = apiVersionOptions(modComponent.apiVersion);

    const implicitRender = versionOptions.explicitRender
      ? null
      : engineRenderer(
          modComponent.templateEngine ?? DEFAULT_IMPLICIT_TEMPLATE_ENGINE,
          versionOptions,
        );

    let html: string;

    if (modComponent.config.if) {
      // Read the latest state at the time of the action
      const input = await ctxtPromise;
      const serviceContext = await makeIntegrationsContextFromDependencies(
        modComponent.integrationDependencies,
      );

      console.debug("Checking button precondition", {
        input,
        serviceContext,
      });

      // There's no button at this point, so can't use the eventTarget targetMode
      if (this.targetMode !== "document") {
        throw new BusinessError(
          `targetMode ${this.targetMode} not supported for conditional buttons`,
        );
      }

      const initialValues: InitialValues = {
        input,
        serviceContext,
        optionsArgs: modComponent.optionsArgs,
        root: document,
      };

      // NOTE: don't use reduceModComponentPipeline because this is just evaluating the condition and shouldn't show up
      // as a "run" in the logs/traces. We also leave off the modComponentLogger (see note)
      const show = await reducePipeline(modComponent.config.if, initialValues, {
        // Don't pass extension: modComponentLogger because our log display doesn't handle the in-starter brick
        // conditionals yet
        ...versionOptions,
      });

      if (!show) {
        return;
      }
    }

    const renderMustache = engineRenderer("mustache", versionOptions);
    assertNotNullish(renderMustache, "Failed to find mustache renderer");

    if (dynamicCaption) {
      const ctxt = await ctxtPromise;
      const serviceContext = await makeIntegrationsContextFromDependencies(
        modComponent.integrationDependencies,
      );

      // Integrations take precedence over the other context
      // XXX: don't support adding "@mod" variable for now. Dynamic Captions are not available in the Page Editor
      const modComponentContext = { ...ctxt, ...serviceContext };

      html = (await renderMustache(this.getTemplate(), {
        caption: (await mapArgs(caption, modComponentContext, {
          implicitRender,
          autoescape: versionOptions.autoescape,
        })) as string,
        icon: icon ? await getSvgIcon(icon) : null,
      })) as string;
    } else {
      html = (await renderMustache(this.getTemplate(), {
        caption,
        icon: icon ? await getSvgIcon(icon) : null,
      })) as string;
    }

    const $button = this.makeButton(html, modComponent);

    $button.on("click", async (event) => {
      let runningElements: WeakSet<HTMLElement> | undefined =
        this.runningModComponentPageElements.get(modComponent.id);
      if (runningElements == null) {
        runningElements = new WeakSet([event.target]);
        this.runningModComponentPageElements.set(
          modComponent.id,
          runningElements,
        );
      } else {
        if (synchronous && runningElements.has(event.target)) {
          return;
        }

        runningElements.add(event.target);
      }

      try {
        event.preventDefault();
        event.stopPropagation();

        console.debug("Run button", this.logger.context);

        reportEvent(Events.BUTTON_CLICK, selectEventData(modComponent));

        try {
          // Read the latest state at the time of the action
          const reader = await this.defaultReader();

          const initialValues: InitialValues = {
            input: await reader.read(
              this.getReaderRoot({
                $containerElement: $buttonContainer,
                $buttonElement: $button,
              }),
            ),
            serviceContext: await makeIntegrationsContextFromDependencies(
              modComponent.integrationDependencies,
            ),
            optionsArgs: modComponent.optionsArgs,
            root: this.getPipelineRoot($button),
          };

          await reduceModComponentPipeline(actionConfig, initialValues, {
            logger: modComponentLogger,
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
            this.platform.toasts.showNotification({
              ...DEFAULT_ACTION_RESULTS.cancel,
              ...pick(onCancel, "message", "type"),
            });
          } else {
            modComponentLogger.error(error);
            this.platform.toasts.showNotification({
              ...DEFAULT_ACTION_RESULTS.error,
              error, // Include more details in the notification
              reportError: false,
              ...pick(onError, "message", "type"),
            });
          }
        }
      } finally {
        runningElements.delete(event.target);
      }
    });

    const $existingButton = $buttonContainer.find(
      `[${DATA_ATTR}="${modComponent.id}"]`,
    );

    if ($existingButton.length > 0) {
      // We don't need to unbind any click handlers because we're replacing the element completely.
      console.debug(
        `Replacing existing button for ${modComponent.id} (${modComponent.label})`,
      );
      $existingButton.replaceWith($button);
    } else {
      console.debug(
        `Adding new button ${modComponent.id} (${modComponent.label})`,
      );
      this.addButton($buttonContainer, $button);
    }

    const buttonElement = $button.get(0);
    assertNotNullish(buttonElement, "Failed to get button element");

    if (process.env.DEBUG) {
      onNodeRemoved(
        buttonElement,
        () => {
          // Don't re-install here. Starter brick will reinstall the entire button container
          console.debug(
            `Button for ${modComponent.id} was removed from the DOM`,
          );
        },
        this.cancelController.signal,
      );
    }
  }

  async runModComponents({ extensionIds = null }: RunArgs): Promise<void> {
    if (this.containers.size === 0 || this.modComponents.length === 0) {
      return;
    }

    const startNavigationId = getNavigationId();
    const isNavigationCancelled = () => getNavigationId() !== startNavigationId;

    const errors: unknown[] = [];

    const containerSelector = this.getContainerSelector();
    const $currentContainers = $safeFind(
      castArray(containerSelector).join(" "),
    );
    const currentContainers = $currentContainers.toArray();

    for (const container of this.containers.values()) {
      if (!currentContainers.includes(container)) {
        console.debug(
          "Skipping button container because it no matches the container selector",
        );
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- TODO: Make it run in parallel if possible while maintaining the order
      const reader = await this.defaultReader();

      let ctxtPromise: Promise<JsonObject> | undefined;

      for (const modComponent of this.modComponents) {
        // Run in order so that the order stays the same for where they get rendered. The service
        // context is the only thing that's async as part of the initial configuration right now

        if (extensionIds != null && !extensionIds.includes(modComponent.id)) {
          continue;
        }

        if (isNavigationCancelled()) {
          continue;
        }

        if (modComponent.config.dynamicCaption || modComponent.config.if) {
          // Lazily read context for the button container if one of the mod components actually uses it

          // Wrap in rejectOnCancelled because if the reader takes a long time to run, the user may
          // navigate away from the page before the reader comes back.
          ctxtPromise = rejectOnCancelled(
            reader.read(
              this.getReaderRoot({
                $containerElement: $(container),
                $buttonElement: null,
              }),
            ),
            isNavigationCancelled,
          );
        }

        try {
          // eslint-disable-next-line no-await-in-loop -- TODO: Make it run in parallel if possible while maintaining the order
          await this.runModComponent(container, ctxtPromise, modComponent);
        } catch (error) {
          if (error instanceof PromiseCancelled) {
            console.debug(
              `buttonStarterBrick run promise cancelled for mod component: ${modComponent.id}`,
            );
          } else {
            errors.push(error);
            reportError(error, {
              context: {
                deploymentId: modComponent._deployment?.id,
                extensionPointId: modComponent.extensionPointId,
                extensionId: modComponent.id,
              },
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      const subject = pluralize(errors.length, "the button", "$$ buttons");
      const message = `An error occurred adding ${subject}`;
      console.warn(message, { errors });
      this.notifyError({
        message,
        reportError: false, // We already reported it in the loop above
      });
    }
  }
}

export class RemoteButtonStarterBrick extends ButtonStarterBrickABC {
  private readonly _definition: ButtonDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: StarterBrickDefinitionLike<ButtonDefinition>;

  public override get defaultOptions(): {
    caption: string;
    [key: string]: string;
  } {
    const { caption, ...defaults } = this._definition.defaultOptions ?? {};
    return {
      caption: caption ?? super.defaultOptions.caption,
      ...defaults,
    };
  }

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<ButtonDefinition>,
  ) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    assertNotNullish(
      cloned.metadata,
      "metadata is required to instantiate a starter brick",
    );
    super(platform, cloned.metadata);
    this._definition = cloned.definition;
    this.rawConfig = cloned;
    const { isAvailable } = cloned.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  override addButton($container: JQuery, $button: JQuery): void {
    const { position = "append" } = this._definition;

    if (typeof position === "object") {
      if (position.sibling) {
        const $sibling = $safeFind(position.sibling, $container);
        if ($sibling.length > 1) {
          throw new Error(
            `Multiple sibling elements for selector: ${position.sibling}`,
          );
        }

        if ($sibling.length === 1) {
          $sibling.before($button);
        } else {
          // Didn't find the sibling, so just try inserting it at the end
          $container.append($button);
        }
      } else {
        // No element to insert the item before, so insert it at the end.
        $container.append($button);
      }
    } else {
      switch (position) {
        case "prepend":
        case "append": {
          // eslint-disable-next-line security/detect-object-injection -- Safe because we're checking the value in the case statements
          $container[position]($button);
          break;
        }

        default: {
          throw new Error(`Unexpected position ${String(position)}`);
        }
      }
    }
  }

  override getReaderRoot({
    $containerElement,
    $buttonElement,
  }: {
    $containerElement: JQuery;
    $buttonElement: JQuery | null;
  }): SelectorRoot {
    if (this._definition.readerSelector && this.targetMode !== "document") {
      throw new BusinessError(
        "Cannot provide both readerSelector and targetMode",
      );
    }

    const selector = this._definition.readerSelector;
    if (selector) {
      if ($containerElement.length > 1) {
        console.warn("getReaderRoot called with multiple containerElements");
      }

      const $elements = $containerElement.parents(selector);
      if ($elements.length > 1) {
        throw new MultipleElementsFoundError(
          selector,
          "Multiple elements found for reader selector",
        );
      }

      if ($elements.length === 0) {
        throw new NoElementsFoundError(
          selector,
          "No elements found for reader selector",
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
      return $elements.get(0)!;
    }

    if (this.targetMode === "eventTarget") {
      if ($buttonElement == null) {
        throw new BusinessError(
          "eventTarget not supported for buttons with dynamic captions",
        );
      }

      const selectorRoot = $buttonElement.get(0);

      assertNotNullish(selectorRoot, "Failed to get button node");

      return selectorRoot;
    }

    return document;
  }

  override getPipelineRoot($buttonElement: JQuery): SelectorRoot {
    if (this.targetMode === "eventTarget") {
      const selectorRoot = $buttonElement.get(0);
      assertNotNullish(selectorRoot, "Failed to get button node");
      return selectorRoot;
    }

    return document;
  }

  override async defaultReader(): Promise<Reader> {
    return mergeReaders(this._definition.reader);
  }

  override getContainerSelector(): string {
    return this._definition.containerSelector;
  }

  override getTemplate(): string {
    return this._definition.template;
  }

  override get attachMode(): AttachMode {
    return this._definition.attachMode ?? "once";
  }

  override get targetMode(): ButtonTargetMode {
    return this._definition.targetMode ?? "document";
  }

  protected makeButton(
    unsanitizedHTML: string,
    modComponent: HydratedModComponent<ButtonStarterBrickConfig>,
  ): JQuery {
    const sanitizedHTML = sanitize(unsanitizedHTML);

    let $root: JQuery;

    if (this._definition.shadowDOM) {
      const tagName = this._definition.shadowDOM.tag;
      assertNotNullish(tagName, "Expected shadowDOM.tag to be defined");
      const root = document.createElement(tagName);
      const shadowRoot = root.attachShadow({ mode: "closed" });
      shadowRoot.innerHTML = sanitizedHTML;
      $root = $(root);
    } else {
      $root = $(sanitizedHTML);
    }

    $root.attr(DATA_ATTR, modComponent.id);

    return $root;
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<ButtonDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== StarterBrickTypes.BUTTON) {
    // `type` is `never` here due to the if-statement
    throw new Error(
      `Expected type=${StarterBrickTypes.BUTTON}, got ${type as string}`,
    );
  }

  return new RemoteButtonStarterBrick(platform, config);
}
