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
import Mustache from "mustache";
import { errorBoundary } from "@/bricks/renderers/common";
import { checkAvailable } from "@/bricks/available";
import { castArray, cloneDeep } from "lodash";
import {
  type InitialValues,
  reduceModComponentPipeline,
} from "@/runtime/reducePipeline";
import {
  acquireElement,
  awaitElementOnce,
  onNodeRemoved,
  selectModComponentContext,
} from "@/starterBricks/helpers";
import { type Metadata } from "@/types/registryTypes";
import {
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { render } from "@/starterBricks/dom";
import { type Permissions } from "webextension-polyfill";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import getSvgIcon from "@/icons/getSvgIcon";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import { PIXIEBRIX_DATA_ATTR } from "@/domConstants";
import { type UUID } from "@/types/stringTypes";
import { type Schema } from "@/types/schemaTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type JsonObject } from "type-fest";
import { type RendererOutput, type RunArgs } from "@/types/runtimeTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { boolean } from "@/utils/typeUtils";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import pluralize from "@/utils/pluralize";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { ReusableAbortController } from "abort-utils";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  type PanelDefinition,
  type PanelConfig,
} from "@/starterBricks/panel/panelStarterBrickTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

const RENDER_LOOP_THRESHOLD = 25;
const RENDER_LOOP_WINDOW_MS = 500;

/**
 * Prevent panel render from entering an infinite loop
 */
function detectLoop(timestamps: Date[]): void {
  const current = new Date();

  const renders = timestamps.filter(
    (x) => Math.abs(current.getTime() - x.getTime()) < RENDER_LOOP_WINDOW_MS,
  );

  if (renders.length > RENDER_LOOP_THRESHOLD) {
    const diffs = timestamps.map((x) =>
      Math.abs(current.getTime() - x.getTime()),
    );
    console.error("Panel is stuck in a render loop", {
      diffs,
    });
    throw new Error("Panel is stuck in a render loop");
  }
}

/**
 * Starter brick that adds a panel inline to a web page. Not currently generally available.
 */
export abstract class PanelStarterBrickABC extends StarterBrickABC<PanelConfig> {
  protected $container: JQuery | null;

  private readonly collapsedModComponents: Map<UUID, boolean>;

  private readonly cancelController = new ReusableAbortController();

  private uninstalled = false;

  // TODO: Rewrite this logic to use AbortController and to possibly unify the logic with the
  // global cancelController. The `onAbort` utility might be useful to link multiple controllers
  // together, but it's probably best to skip the duplicate `cancelController`.
  private readonly cancelRemovalMonitor: Map<string, () => void>;

  private readonly renderTimestamps: Map<string, Date[]>;

  public override get defaultOptions(): { heading: string } {
    return { heading: "Custom Panel" };
  }

  protected constructor(platform: PlatformProtocol, metadata: Metadata) {
    super(platform, metadata);
    this.$container = null;
    this.collapsedModComponents = new Map();
    this.cancelRemovalMonitor = new Map();
    this.renderTimestamps = new Map();
  }

  inputSchema: Schema = propertiesToSchema(
    {
      heading: {
        type: "string",
        description: "The panel heading",
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
      shadowDOM: {
        type: "boolean",
        description: "Whether or not to use a shadow DOM for the body",
        default: true,
      },
      collapsible: {
        type: "boolean",
        description: "Whether or not the body is collapsible",
        default: false,
      },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
    },
    ["heading", "body"],
  );

  public get kind(): "panel" {
    return "panel";
  }

  readonly capabilities: PlatformCapability[] = CONTENT_SCRIPT_CAPABILITIES;

  async getBricks(
    modComponent: HydratedModComponent<PanelConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.body);
  }

  clearModComponentInterfaceAndEvents(): void {
    // FIXME: implement this to avoid unnecessary firing
    console.warn(
      "clearModComponentInterfaceAndEvents not implemented for panel starter brick",
    );
  }

  override async defaultReader(): Promise<Reader> {
    throw new Error("PanelStarterBrick.defaultReader not implemented");
  }

  abstract getTemplate(): string;

  abstract getContainerSelector(): string | string[];

  abstract override isAvailable(): Promise<boolean>;

  override uninstall(): void {
    this.uninstalled = true;

    for (const modComponent of this.modComponents) {
      const $item = this.$container?.find(
        `[${PIXIEBRIX_DATA_ATTR}="${modComponent.id}"]`,
      );
      if ($item?.length === 0) {
        console.debug(`Panel for ${modComponent.id} was not in the menu`);
      }

      $item?.remove();
    }

    this.$container = null;

    this.cancelController.abortAndReset();
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      console.debug(
        `Skipping panel starter brick because it's not available for the page: ${this.id}`,
      );
      return false;
    }

    const selector = this.getContainerSelector();

    console.debug(
      `Awaiting panel container for ${this.id}: ${JSON.stringify(selector)}`,
    );

    const containerPromise = awaitElementOnce(
      selector,
      this.cancelController.signal,
    );

    this.$container = (await containerPromise) as JQuery;

    if (this.$container.length === 0) {
      return false;
    }

    if (this.$container.length > 1) {
      console.error(
        `Multiple containers found for selector: ${JSON.stringify(selector)}`,
      );
      this.logger.error(`Multiple containers found: ${this.$container.length}`);
      return false;
    }

    const container = this.$container.get(0);

    assertNotNullish(
      container,
      "Container for panel starter brick must be defined",
    );

    const acquired = acquireElement(container, this.id);

    if (acquired) {
      onNodeRemoved(
        container,
        () => {
          console.debug(
            `Container removed from DOM for ${this.id}: ${JSON.stringify(
              selector,
            )}`,
          );
          this.$container = null;
        },
        this.cancelController.signal,
      );
    }

    return acquired;
  }

  addPanel($panel: JQuery): void {
    assertNotNullish(
      this.$container,
      "Container must be defined to append panel",
    );
    this.$container.append($panel);
  }

  private async runModComponent(
    readerOutput: JsonObject,
    modComponent: HydratedModComponent<PanelConfig>,
  ) {
    if (this.uninstalled) {
      throw new Error("panelStarterBrick has already been destroyed");
    }

    // Initialize render timestamps for mod component
    let renderTimestamps = this.renderTimestamps.get(modComponent.id);
    if (renderTimestamps == null) {
      this.renderTimestamps.set(modComponent.id, []);
      renderTimestamps = this.renderTimestamps.get(modComponent.id);
    }

    assertNotNullish(renderTimestamps, "renderTimestamps cannot be null");

    renderTimestamps.push(new Date());
    const cnt = renderTimestamps.length;

    console.debug(`Run panelStarterBrick: ${modComponent.id}`);

    detectLoop(renderTimestamps);

    const bodyUUID = uuidv4();
    const modComponentLogger = this.logger.childLogger(
      selectModComponentContext(modComponent),
    );

    const {
      body,
      icon,
      heading,
      collapsible: rawCollapsible = false,
      shadowDOM: rawShadowDOM = true,
    } = modComponent.config;

    const collapsible = boolean(rawCollapsible);
    const shadowDOM = boolean(rawShadowDOM);

    // Start collapsed
    if (collapsible && cnt === 1) {
      this.collapsedModComponents.set(modComponent.id, true);
    }

    const integrationsContext = await makeIntegrationsContextFromDependencies(
      modComponent.integrationDependencies,
    );
    const componentContext = { ...readerOutput, ...integrationsContext };

    assertNotNullish(
      heading,
      "Heading must be defined for Mustache to render the template",
    );

    const $panel = $(
      Mustache.render(this.getTemplate(), {
        heading: Mustache.render(heading, componentContext),
        // Render a placeholder body that we'll fill in async
        body: `<div id="${bodyUUID}"></div>`,
        icon: icon ? await getSvgIcon(icon) : null,
        bodyUUID,
      }),
    );

    $panel.attr(PIXIEBRIX_DATA_ATTR, modComponent.id);

    assertNotNullish(this.$container, "Container must exist");

    const $existingPanel = this.$container.find(
      `[${PIXIEBRIX_DATA_ATTR}="${modComponent.id}"]`,
    );

    // Clean up removal monitor, otherwise it will be re-triggered during replaceWith
    const cancelCurrent = this.cancelRemovalMonitor.get(modComponent.id);
    if (cancelCurrent) {
      console.debug(`Cancelling removal monitor for ${modComponent.id}`);
      cancelCurrent();
      this.cancelRemovalMonitor.delete(modComponent.id);
    } else {
      console.debug(`No current removal monitor for ${modComponent.id}`);
    }

    if ($existingPanel.length > 0) {
      if (this.cancelRemovalMonitor.get(modComponent.id) != null) {
        throw new Error("Removal monitor still attached for panel");
      }

      console.debug(`Replacing existing panel for ${modComponent.id}`);
      $existingPanel.replaceWith($panel);
    } else {
      console.debug(`Adding new panel for ${modComponent.id}`);
      this.addPanel($panel);
      reportEvent(Events.PANEL_ADD, selectEventData(modComponent));
    }

    // FIXME: required sites that remove the panel, e.g., Pipedrive. Currently causing infinite loop on Salesforce
    //  when switching between cases. Also refer to the `cancelRemovalMonitor` TODO above.
    // const cancelNodeRemoved = onNodeRemoved($panel.get(0), () => {
    //   console.debug(
    //     `Panel for ${extension.id} was removed from the DOM (render: ${cnt}); re-running`
    //   );
    //   this.run([extension.id]);
    // });
    // this.cancelRemovalMonitor.set(extension.id, cancelNodeRemoved);
    // this.cancelPending.add(cancelNodeRemoved);

    // update the body content with the new args
    const $bodyContainers = this.$container.find(`#${bodyUUID}`);

    if ($bodyContainers.length > 1) {
      throw new Error("Found multiple body containers");
    }

    const bodyContainer = $bodyContainers.get(0);
    assertNotNullish(bodyContainer, "No body containers found");

    let isBodyInstalled = false;

    const installBody = async () => {
      if (!isBodyInstalled) {
        isBodyInstalled = true;

        const initialValues: InitialValues = {
          input: readerOutput,
          optionsArgs: modComponent.optionsArgs,
          serviceContext: integrationsContext,
          root: document,
        };

        const rendererPromise = reduceModComponentPipeline(
          body,
          initialValues,
          {
            logger: modComponentLogger,
            ...apiVersionOptions(modComponent.apiVersion),
          },
        ) as Promise<RendererOutput>;

        try {
          const bodyOrComponent = await errorBoundary(
            rendererPromise,
            modComponentLogger,
          );
          render(bodyContainer, bodyOrComponent, {
            shadowDOM,
          });
          modComponentLogger.debug("Successfully installed panel");
        } catch (error) {
          modComponentLogger.error(error);
        }
      }
    };

    if (collapsible) {
      const startExpanded = !this.collapsedModComponents.get(modComponent.id);

      $bodyContainers.addClass(["collapse"]);
      const $toggle = $panel.find('[data-toggle="collapse"]');

      $bodyContainers.toggleClass("show", startExpanded);
      $toggle.attr("aria-expanded", String(startExpanded));
      $toggle.toggleClass("active", startExpanded);

      $toggle.on("click", async () => {
        $bodyContainers.toggleClass("show");
        const showing = $bodyContainers.hasClass("show");
        $toggle.attr("aria-expanded", String(showing));
        $toggle.toggleClass("active", showing);
        this.collapsedModComponents.set(modComponent.id, !showing);
        if (showing) {
          console.debug(
            `Installing body for collapsible panel: ${modComponent.id}`,
          );
          await installBody();
        }
      });

      if (startExpanded) {
        await installBody();
      }
    } else {
      console.debug(
        `Installing body for non-collapsible panel: ${modComponent.id}`,
      );
      await installBody();
    }
  }

  async runModComponents({ extensionIds = null }: RunArgs): Promise<void> {
    if (!this.$container || this.modComponents.length === 0) {
      return;
    }

    const reader = await this.defaultReader();

    const readerContext = await reader.read(document);
    if (readerContext == null) {
      throw new Error("Reader returned null/undefined");
    }

    const errors: unknown[] = [];

    for (const modComponent of this.modComponents) {
      if (extensionIds != null && !extensionIds.includes(modComponent.id)) {
        continue;
      }

      try {
        /* eslint-disable-next-line no-await-in-loop
        -- Running in loop to ensure consistent placement. OK because `installBody` in runExtension is runs asynchronously */
        await this.runModComponent(readerContext, modComponent);
      } catch (error) {
        errors.push(error);
        this.logger
          .childLogger({
            deploymentId: modComponent._deployment?.id,
            extensionId: modComponent.id,
          })
          .error(error);
      }
    }

    if (errors.length > 0) {
      this.platform.toasts.showNotification({
        type: "error",
        message: `An error occurred adding ${pluralize(
          errors.length,
          "$$ panel",
        )}`,
      });
    }
  }
}

class RemotePanelStarterBrick extends PanelStarterBrickABC {
  private readonly _definition: PanelDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: StarterBrickDefinitionLike<PanelDefinition>;

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<PanelDefinition>,
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
    const { isAvailable } = cloned.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  public override get defaultOptions(): {
    heading: string;
    [key: string]: string;
  } {
    const { heading, ...defaults } = this._definition.defaultOptions ?? {};
    return {
      heading: heading ?? super.defaultOptions.heading,
      ...defaults,
    };
  }

  override async defaultReader(): Promise<Reader> {
    return mergeReaders(this._definition.reader);
  }

  override addPanel($panel: JQuery): void {
    assertNotNullish(
      this.$container,
      "Container must be defined to append or prepend panel",
    );
    const { position = "append" } = this._definition;

    if (typeof position !== "string") {
      throw new TypeError("Expected string for panel position");
    }

    switch (position) {
      case "prepend":
      case "append": {
        // eslint-disable-next-line security/detect-object-injection -- Safe because we're casing the method name
        this.$container[position]($panel);
        break;
      }

      default: {
        // Type is `never` due to checks above
        const exhaustiveCheck: never = position;
        throw new Error(`Unexpected position: ${exhaustiveCheck}`);
      }
    }
  }

  override getContainerSelector(): string {
    return this._definition.containerSelector;
  }

  override getTemplate(): string {
    return this._definition.template;
  }

  override async isAvailable(): Promise<boolean> {
    const { isAvailable } = this._definition;
    return checkAvailable(isAvailable);
  }
}

export function fromJS(
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<PanelDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== "panel") {
    throw new Error(`Expected type=panel, got ${type}`);
  }

  return new RemotePanelStarterBrick(platform, config);
}
