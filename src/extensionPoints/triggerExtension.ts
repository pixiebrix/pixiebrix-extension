/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { ExtensionPoint } from "@/types";
import { InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import {
  IBlock,
  ResolvedExtension,
  IExtensionPoint,
  ReaderOutput,
  ReaderRoot,
  Schema,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { Permissions } from "webextension-polyfill";
import { castArray, cloneDeep, compact, noop } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { reportError } from "@/telemetry/logging";
import { reportEvent } from "@/telemetry/events";
import {
  awaitElementOnce,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import { notifyError } from "@/contentScript/notify";
// @ts-expect-error using jquery for the JQuery.EventHandler type below
import JQuery from "jquery";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { PromiseCancelled, sleep } from "@/utils";
import initialize from "@/vendors/initialize";
import { $safeFind } from "@/helpers";

export type TriggerConfig = {
  action: BlockPipeline | BlockConfig;
};

export type AttachMode =
  // Attach handlers once (for any elements available at the time of attaching handlers) (default)
  | "once"
  // Watch for new elements and attach triggers to any new elements that matches the selector. Only supports native
  // CSS selectors (because it uses MutationObserver under the hood)
  | "watch";

export type TargetMode =
  // The element that triggered the event
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
  | "eventTarget"
  // The element the trigger is attached to
  | "root";

export type Trigger =
  // `load` is page load
  | "load"
  // `interval` is a fixed interval
  | "interval"
  // `appear` is triggered when an element enters the user's viewport
  | "appear"
  | "click"
  | "blur"
  | "dblclick"
  | "mouseover"
  | "change";

async function interval(
  intervalMillis: number,
  effectGenerator: () => Promise<void>,
  signal: AbortSignal
) {
  while (!signal.aborted) {
    const start = Date.now();

    try {
      // Request an animation frame so that animation effects (e.g., confetti) don't pile up while the user is not
      // using the tab/frame running the interval.
      // eslint-disable-next-line no-await-in-loop -- intentionally running in sequence
      await new Promise((resolve) => {
        window.requestAnimationFrame(resolve);
      });

      // eslint-disable-next-line no-await-in-loop -- intentionally running in sequence
      await effectGenerator();
    } catch {
      // NOP
    }

    const sleepDuration = Math.max(0, intervalMillis - (Date.now() - start));

    if (sleepDuration > 0) {
      // Would also be OK to pass 0 to sleep duration
      // eslint-disable-next-line no-await-in-loop -- intentionally running in sequence
      await sleep(sleepDuration);
    }
  }

  console.debug("interval:completed");
}

export abstract class TriggerExtensionPoint extends ExtensionPoint<TriggerConfig> {
  abstract get trigger(): Trigger;

  abstract get attachMode(): AttachMode;

  abstract get intervalMillis(): number;

  abstract get targetMode(): TargetMode;

  abstract get triggerSelector(): string | null;

  /**
   * Cancel awaiting the element during this.run()
   * @private
   */
  private cancelInitialWaitElements: (() => void) | null;

  /**
   * Cancel the initialization observer in "watch" attachMode.
   * @private
   */
  private cancelWatchNewElements: (() => void) | null;

  /**
   * Observer to watch for new elements to appear, or undefined if the trigger is not an `appear` trigger
   * @private
   */
  private appearObserver: IntersectionObserver | undefined;

  /**
   * Installed DOM event listeners, e.g., `click`
   * @private
   */
  // XXX: does this need to be a set? Shouldn't there only ever be 1 trigger since the trigger is defined on the
  // extension point?
  private readonly installedEvents: Set<string> = new Set();

  /**
   * A bound version of eventHandler
   * @private
   */
  private readonly boundEventHandler: JQuery.EventHandler<unknown>;

  /**
   * Controller to abort/cancel the currently running interval loop
   * @private
   */
  private intervalController: AbortController | null;

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faBolt"
  ) {
    super(id, name, description, icon);
    this.cancelInitialWaitElements = null;
    this.cancelWatchNewElements = null;

    // Bind so we can pass as callback
    this.boundEventHandler = this.eventHandler.bind(this);
  }

  async install(): Promise<boolean> {
    return this.isAvailable();
  }

  removeExtensions(): void {
    // NOP: the removeExtensions method doesn't need to unregister anything from the page because the
    // observers/handlers are installed for the extensionPoint itself, not the extensions. I.e., there's a single
    // load/click/etc. trigger that's shared by all extensions using this extension point.
    console.debug("triggerExtension:removeExtensions");
  }

  uninstall(): void {
    console.debug("triggerExtension:uninstall");

    // Clean up observers
    this.cancelInitialWaitElements?.();
    this.cancelWatchNewElements?.();
    this.appearObserver?.disconnect();
    this.appearObserver = null;
    this.cancelInitialWaitElements = null;
    this.cancelWatchNewElements = null;

    this.clearInterval();

    // Find the latest set of DOM elements and uninstall handlers
    if (this.triggerSelector) {
      const $currentElements = $safeFind(this.triggerSelector);

      console.debug(
        "Removing %s handler from %d elements",
        this.trigger,
        $currentElements.length
      );

      if ($currentElements.length > 0) {
        try {
          // This won't impact with other trigger extension points because the handler reference is unique to `this`
          for (const event of this.installedEvents) {
            $currentElements.off(event, this.boundEventHandler);
          }
        } finally {
          this.installedEvents.clear();
        }
      }
    }
  }

  inputSchema: Schema = propertiesToSchema({
    action: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  async getBlocks(
    extension: ResolvedExtension<TriggerConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  private async runExtension(
    ctxt: ReaderOutput,
    extension: ResolvedExtension<TriggerConfig>,
    root: ReaderRoot
  ) {
    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    const { action: actionConfig } = extension.config;

    const initialValues: InitialValues = {
      input: ctxt,
      root,
      serviceContext: await makeServiceContext(extension.services),
      optionsArgs: extension.optionsArgs,
    };

    try {
      await reducePipeline(actionConfig, initialValues, {
        logger: extensionLogger,
        ...apiVersionOptions(extension.apiVersion),
      });
      extensionLogger.info("Successfully ran trigger");
    } catch (error) {
      extensionLogger.error(error);
    }
  }

  /**
   * Shared event handler for DOM event triggers
   * @param event
   */
  private readonly eventHandler: JQuery.EventHandler<unknown> = async (
    event
  ) => {
    console.debug("Handling DOM event", {
      target: event.target,
      event,
    });

    let element = event.target;

    if (this.targetMode === "root") {
      element = $(event.target).closest(this.triggerSelector).get(0);
      console.debug(
        "Locating closest element for target: %s",
        this.triggerSelector
      );
    }

    const promises = await Promise.allSettled([this.runTrigger(element)]);
    TriggerExtensionPoint.notifyErrors(compact(promises));
  };

  private async runTrigger(root: ReaderRoot): Promise<unknown[]> {
    const reader = await this.defaultReader();
    const readerContext = await reader.read(root);
    const errors = await Promise.all(
      this.extensions.map(async (extension) => {
        const extensionLogger = this.logger.childLogger(
          selectExtensionContext(extension)
        );
        try {
          await this.runExtension(readerContext, extension, root);
        } catch (error) {
          reportError(error, extensionLogger.context);
          return error;
        }

        reportEvent("TriggerRun", selectEventData(extension));
      })
    );
    return compact(errors);
  }

  static notifyErrors(results: Array<PromiseSettledResult<unknown[]>>): void {
    const errors = compact(
      results.flatMap((x) => (x.status === "fulfilled" ? x.value : [x.reason]))
    );
    if (errors.length > 0) {
      console.debug("Trigger errors", errors);
      notifyError(`An error occurred running ${errors.length} triggers(s)`);
    }
  }

  private async getRoot(): Promise<JQuery<HTMLElement | Document>> {
    const rootSelector = this.triggerSelector;

    // Await for the element(s) to appear on the page so that we can
    const [rootPromise, cancelRun] = rootSelector
      ? awaitElementOnce(rootSelector)
      : [document, noop];

    this.cancelInitialWaitElements = cancelRun;

    try {
      await rootPromise;
    } catch (error) {
      if (error instanceof PromiseCancelled) {
        return;
      }

      throw error;
    } finally {
      this.cancelInitialWaitElements = null;
    }

    // AwaitElementOnce doesn't work with multiple elements. Get everything that's on the current page
    const $root = rootSelector ? $safeFind(rootSelector) : $(document);

    if ($root.length === 0) {
      console.warn("No elements found for trigger selector: %s", rootSelector);
    }

    return $root;
  }

  private clearInterval() {
    console.debug("triggerExtension:clearInterval");
    this.intervalController?.abort();
    this.intervalController = null;
  }

  private attachInterval() {
    this.clearInterval();

    if (this.intervalMillis > 0) {
      this.logger.debug("Attaching interval trigger");

      // Cast setInterval return value to number. For some reason Typescript is using the Node types for setInterval
      const controller = new AbortController();

      const intervalEffect = async () => {
        const $root = await this.getRoot();
        await Promise.allSettled(
          $root.toArray().flatMap(async (root) => this.runTrigger(root))
        );
      };

      void interval(this.intervalMillis, intervalEffect, controller.signal);

      this.intervalController = controller;

      console.debug("triggerExtension:attachInterval", {
        intervalMillis: this.intervalMillis,
      });
    } else {
      this.logger.warn(
        "Skipping interval trigger because interval is not greater than zero"
      );
    }
  }

  private attachAppearTrigger($element: JQuery): void {
    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

    this.appearObserver?.disconnect();

    this.appearObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries.filter((x) => x.isIntersecting)) {
          void this.runTrigger(entry.target as HTMLElement).then((errors) => {
            if (errors.length > 0) {
              console.error("An error occurred while running a trigger", {
                errors,
              });
              notifyError("An error occurred while running a trigger");
            }
          });
        }
      },
      {
        root: null,
        // RootMargin: "0px",
        threshold: 0.2,
      }
    );

    for (const element of $element) {
      this.appearObserver.observe(element);
    }

    if (this.attachMode === "watch") {
      const selector = this.triggerSelector;

      console.debug("Watching selector: %s", selector);
      const mutationObserver = initialize(
        selector,
        (index, element) => {
          console.debug("initialize: %s", selector);
          this.appearObserver.observe(element);
        },
        { target: document }
      );

      this.cancelWatchNewElements = mutationObserver.disconnect.bind(
        mutationObserver
      );
    }
  }

  private attachDOMTrigger(
    $element: JQuery,
    { watch = false }: { watch?: boolean }
  ): void {
    console.debug(
      "Removing existing %s handler for extension point",
      this.trigger
    );
    $element.off(this.trigger, this.boundEventHandler);

    $element.on(this.trigger, this.boundEventHandler);
    this.installedEvents.add(this.trigger);
    console.debug(
      "Installed %s event handler on %d elements",
      this.trigger,
      $element.length,
      {
        trigger: this.trigger,
        selector: this.triggerSelector,
        targetMode: this.targetMode,
        watch,
      }
    );

    if (watch) {
      this.cancelWatchNewElements?.();
      this.cancelWatchNewElements = null;

      const mutationObserver = initialize(
        this.triggerSelector,
        (index, element) => {
          // Already watching, so don't re-watch on the recursive call
          this.attachDOMTrigger($(element as HTMLElement), { watch: false });
        },
        { target: document }
      );
      this.cancelWatchNewElements = mutationObserver.disconnect.bind(
        mutationObserver
      );
    }
  }

  private assertElement(
    $root: JQuery<HTMLElement | Document>
  ): asserts $root is JQuery {
    if ($root.get(0) === document) {
      throw new Error(`Trigger ${this.trigger} requires a selector`);
    }
  }

  private cancelObservers() {
    this.cancelInitialWaitElements?.();
    this.cancelWatchNewElements?.();
    this.cancelInitialWaitElements = null;
    this.cancelWatchNewElements = null;
  }

  async run(): Promise<void> {
    this.cancelObservers();

    const $root = await this.getRoot();

    switch (this.trigger) {
      case "load": {
        const promises = await Promise.allSettled(
          $root.toArray().flatMap(async (root) => this.runTrigger(root))
        );
        TriggerExtensionPoint.notifyErrors(promises);
        break;
      }

      case "interval": {
        this.attachInterval();
        break;
      }

      case "appear": {
        this.assertElement($root);
        this.attachAppearTrigger($root);
        break;
      }

      default: {
        if (this.trigger) {
          this.assertElement($root);
          this.attachDOMTrigger($root, { watch: this.attachMode === "watch" });
        } else {
          throw new Error("No trigger event configured for extension point");
        }
      }
    }
  }
}

type TriggerDefinitionOptions = Record<string, string>;

export interface TriggerDefinition extends ExtensionPointDefinition {
  defaultOptions?: TriggerDefinitionOptions;

  /**
   * The selector for the element to watch for the trigger.
   *
   * Ignored for the page `load` trigger.
   */
  rootSelector?: string;

  /**
   * - `once` (default) to attach handler once to all elements when `rootSelector` becomes available.
   * - `watch` to attach handlers to new elements that match the selector
   * @since 1.4.7
   */
  attachMode?: AttachMode;

  /**
   * @since 1.4.8
   */
  targetMode?: TargetMode;

  /**
   * The trigger event
   */
  trigger?: Trigger;

  /**
   * For `interval` trigger, the interval in milliseconds.
   */
  intervalMillis?: number;
}

class RemoteTriggerExtensionPoint extends TriggerExtensionPoint {
  private readonly _definition: TriggerDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: ExtensionPointConfig<TriggerDefinition>;

  public get defaultOptions(): Record<string, string> {
    return this._definition.defaultOptions ?? {};
  }

  constructor(config: ExtensionPointConfig<TriggerDefinition>) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    const { id, name, description, icon } = cloned.metadata;
    super(id, name, description, icon);
    this._definition = cloned.definition;
    this.rawConfig = cloned;
    const { isAvailable } = cloned.definition;
    this.permissions = {
      permissions: ["tabs", "webNavigation"],
      origins: castArray(isAvailable.matchPatterns),
    };
  }

  get trigger(): Trigger {
    return this._definition.trigger ?? "load";
  }

  get targetMode(): TargetMode {
    return this._definition.targetMode ?? "eventTarget";
  }

  get attachMode(): AttachMode {
    return this._definition.attachMode ?? "once";
  }

  get intervalMillis(): number {
    return this._definition.intervalMillis ?? 0;
  }

  get triggerSelector(): string | null {
    return this._definition.rootSelector;
  }

  async defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<TriggerDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "trigger") {
    throw new Error(`Expected type=trigger, got ${type}`);
  }

  return new RemoteTriggerExtensionPoint(config);
}
