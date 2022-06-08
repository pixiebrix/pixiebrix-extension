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
  Logger,
  Metadata,
  ReaderOutput,
  ResolvedExtension,
  RunArgs,
  RunReason,
  Schema,
  UUID,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPoint,
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { Permissions } from "webextension-polyfill";
import { checkAvailable } from "@/blocks/available";
import notify from "@/utils/notify";
import {
  isSidebarVisible,
  registerShowCallback,
  removeExtensionPoint,
  removeShowCallback,
  reservePanels,
  ShowCallback,
  updateHeading,
  upsertPanel,
} from "@/contentScript/sidebarController";
import Mustache from "mustache";
import { uuidv4 } from "@/types/helpers";
import { getErrorMessage } from "@/errors/errorHelpers";
import { HeadlessModeError } from "@/blocks/errors";
import {
  pickEventProperties,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import { cloneDeep, debounce } from "lodash";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { BusinessError } from "@/errors/businessErrors";

export type SidebarConfig = {
  heading: string;
  body: BlockConfig | BlockPipeline;
};

/**
 * Follows the semantics of lodash's debounce: https://lodash.com/docs/4.17.15#debounce
 */
export type DebounceOptions = {
  /**
   * The number of milliseconds to delay.
   */
  waitMillis?: number;

  /**
   * Specify invoking on the leading edge of the timeout.
   */
  leading?: boolean;

  /**
   *  Specify invoking on the trailing edge of the timeout.
   */
  trailing?: boolean;
};

/**
 * Custom options for the `custom` trigger
 * @since 1.6.5
 */
export type CustomEventOptions = {
  /**
   * The name of the event.
   */
  eventName: "string";
};

export type Trigger =
  // `load` is page load/navigation (default for backward compatability)
  | "load"
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  | "selectionchange"
  // Manually, e.g., via the Page Editor or Show Sidebar brick
  | "manual"
  // A custom event configured by the user
  | "custom";

export abstract class SidebarExtensionPoint extends ExtensionPoint<SidebarConfig> {
  abstract get trigger(): Trigger;

  abstract get debounceOptions(): DebounceOptions;

  abstract get customTriggerOptions(): CustomEventOptions;

  readonly permissions: Permissions.Permissions = {};

  readonly showCallback: ShowCallback;

  /**
   * Controller to drop all listeners and timers
   * @private
   */
  private abortController = new AbortController();

  private installedListeners = false;

  /**
   * A bound version of eventHandler
   * @private
   */
  private readonly boundEventHandler: JQuery.EventHandler<unknown>;

  protected constructor(metadata: Metadata, logger: Logger) {
    super(metadata, logger);
    this.showCallback = SidebarExtensionPoint.prototype.run.bind(this);
    // Bind so we can pass as callback
    this.boundEventHandler = this.eventHandler.bind(this);
  }

  /**
   * Refresh all panels for the extension point
   * @private
   */
  // Can't set in constructor because the constructor doesn't have access to debounceOptions
  private debouncedRefreshPanelsAndNotify?: ({
    nativeEvent,
  }: {
    nativeEvent: Event | null;
  }) => Promise<void>;

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
    ["heading", "body"]
  );

  // Historical context: in the browser API, the toolbar icon is bound to an action. This is a panel that's shown
  // when the user toggles the toolbar icon. Hence: actionPanel
  public get kind(): "actionPanel" {
    return "actionPanel";
  }

  async getBlocks(
    extension: ResolvedExtension<SidebarConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.body);
  }

  removeExtensions(): void {
    this.extensions.splice(0, this.extensions.length);
  }

  public override uninstall(): void {
    this.removeExtensions();
    removeExtensionPoint(this.id);
    removeShowCallback(this.showCallback);
    this.cancelListeners();
  }

  /**
   * HACK: a version of uninstall that keeps the panel for extensionId in the sidebar so the tab doesn't flicker
   * @param extensionId the panel to preserve
   * @see uninstall
   */
  public HACK_uninstallExceptExtension(extensionId: UUID): void {
    this.removeExtensions();
    removeExtensionPoint(this.id, { preserveExtensionIds: [extensionId] });
    removeShowCallback(this.showCallback);
  }

  private async runExtension(
    readerContext: ReaderOutput,
    extension: ResolvedExtension<SidebarConfig>
  ) {
    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    const serviceContext = await makeServiceContext(extension.services);
    const extensionContext = { ...readerContext, ...serviceContext };

    const { heading: rawHeading, body } = extension.config;

    const heading = Mustache.render(rawHeading, extensionContext);

    updateHeading(extension.id, heading);

    const initialValues: InitialValues = {
      input: readerContext,
      optionsArgs: extension.optionsArgs,
      root: document,
      serviceContext,
    };

    try {
      await reduceExtensionPipeline(body, initialValues, {
        headless: true,
        logger: extensionLogger,
        ...apiVersionOptions(extension.apiVersion),
      });
      // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
      // noinspection ExceptionCaughtLocallyJS
      throw new BusinessError("No renderer brick attached to body");
    } catch (error) {
      const ref = {
        extensionId: extension.id,
        extensionPointId: this.id,
        blueprintId: extension._recipe?.id,
      };

      if (error instanceof HeadlessModeError) {
        upsertPanel(ref, heading, {
          blockId: error.blockId,
          key: uuidv4(),
          ctxt: error.ctxt,
          args: error.args,
        });
      } else {
        extensionLogger.error(error);
        upsertPanel(ref, heading, {
          key: uuidv4(),
          error: getErrorMessage(error as Error),
        });
      }
    }
  }

  /**
   * DO NOT CALL DIRECTLY - call debouncedRefreshPanels
   */
  private async refreshPanels(
    // Force parameter to be included to make it explicit which types of triggers pass nativeEvent
    { nativeEvent }: { nativeEvent: Event | null }
  ): Promise<void> {
    const reader = await this.defaultReader();

    const readerContext = {
      // The default reader overrides the event property
      event: nativeEvent ? pickEventProperties(nativeEvent) : null,
      ...(await reader.read(document)),
    };

    const errors: unknown[] = [];

    // OK to run in parallel because we've fixed the order the panels appear in reservePanels
    await Promise.all(
      this.extensions.map(async (extension) => {
        try {
          await this.runExtension(readerContext, extension);
        } catch (error) {
          errors.push(error);
          this.logger
            .childLogger({
              deploymentId: extension._deployment?.id,
              extensionId: extension.id,
            })
            .error(error);
        }
      })
    );

    if (errors.length > 0) {
      notify.error(`An error occurred adding ${errors.length} panels(s)`);
    }
  }

  addCancelHandler(callback: () => void): void {
    this.abortController.signal.addEventListener("abort", callback);
  }

  cancelListeners(): void {
    // Inform registered listeners
    this.abortController.abort();

    // Allow new registrations
    this.abortController = new AbortController();

    this.installedListeners = false;
  }

  /**
   * Shared event handler for DOM event triggers
   */
  private readonly eventHandler: JQuery.EventHandler<unknown> = async (
    event
  ) => {
    const nativeEvent = event.originalEvent;
    return this.debouncedRefreshPanelsAndNotify({ nativeEvent });
  };

  private attachEventTrigger(eventName: string): void {
    const $document = $(document);

    $document.off(eventName, this.boundEventHandler);

    // Install the DOM trigger
    $document.on(eventName, this.boundEventHandler);

    this.addCancelHandler(() => {
      $document.off(eventName, this.boundEventHandler);
    });
  }

  async run({ reason }: RunArgs): Promise<void> {
    if (!(await this.isAvailable())) {
      // Keep sidebar up-to-date regardless of trigger policy
      removeExtensionPoint(this.id);
      return;
    }

    if (this.extensions.length === 0) {
      console.debug(
        "Sidebar extension point %s has no installed extensions",
        this.id
      );
      return;
    }

    if (!isSidebarVisible()) {
      console.debug(
        "Skipping run for %s because sidebar is not visible",
        this.id
      );
      return;
    }

    reservePanels(
      this.extensions.map((extension) => ({
        extensionId: extension.id,
        extensionPointId: this.id,
        blueprintId: extension._recipe?.id,
      }))
    );

    // On the initial run or a manual run, run directly
    if (
      this.trigger === "load" ||
      [RunReason.MANUAL, RunReason.INITIAL_LOAD].includes(reason)
    ) {
      void this.debouncedRefreshPanelsAndNotify({ nativeEvent: null });
    }

    if (!this.installedListeners) {
      if (this.trigger === "selectionchange") {
        this.attachEventTrigger(this.trigger);
      } else if (
        this.trigger === "custom" &&
        this.customTriggerOptions?.eventName
      ) {
        this.attachEventTrigger(this.customTriggerOptions?.eventName);
      }

      this.installedListeners = true;
    }
  }

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      registerShowCallback(this.showCallback);
    } else {
      removeExtensionPoint(this.id);
    }

    const boundRefresh = this.refreshPanels.bind(this);

    this.debouncedRefreshPanelsAndNotify = this.debounceOptions
      ? debounce(boundRefresh, this.debounceOptions.waitMillis ?? 0, {
          ...this.debounceOptions,
        })
      : boundRefresh;

    return available;
  }
}

export interface PanelDefinition extends ExtensionPointDefinition {
  /**
   * The trigger to refresh the panel
   *
   * @since 1.6.5
   */
  trigger?: Trigger;

  /**
   * For `custom` trigger, the custom event trigger options.
   *
   * @since 1.6.5
   */
  customEvent?: CustomEventOptions;

  /**
   * Options for debouncing the overall refresh of the panel
   *
   * @since 1.6.5
   */
  debounce?: DebounceOptions;
}

class RemotePanelExtensionPoint extends SidebarExtensionPoint {
  private readonly definition: PanelDefinition;

  public readonly rawConfig: ExtensionPointConfig;

  constructor(config: ExtensionPointConfig) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(cloned.metadata, new BackgroundLogger());
    this.rawConfig = cloned;
    this.definition = cloned.definition;
  }

  override async defaultReader(): Promise<IReader> {
    return mergeReaders(this.definition.reader);
  }

  get debounceOptions(): DebounceOptions | null {
    return this.definition.debounce;
  }

  get customTriggerOptions(): CustomEventOptions | null {
    return this.definition.customEvent;
  }

  get trigger(): Trigger {
    // Default to load for backward compatability
    return this.definition.trigger ?? "load";
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this.definition.isAvailable);
  }
}

export function fromJS(config: ExtensionPointConfig): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "actionPanel") {
    throw new Error(`Expected type=actionPanel, got ${type}`);
  }

  return new RemotePanelExtensionPoint(config);
}
