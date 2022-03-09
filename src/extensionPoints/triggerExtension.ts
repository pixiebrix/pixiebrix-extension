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

import { ExtensionPoint } from "@/types";
import { InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import {
  IBlock,
  ResolvedExtension,
  IExtensionPoint,
  ReaderOutput,
  ReaderRoot,
  Schema,
  Metadata,
  Logger,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { Permissions } from "webextension-polyfill";
import { castArray, cloneDeep, compact, noop } from "lodash";
import { checkAvailable } from "@/blocks/available";
import reportError from "@/telemetry/reportError";
import { reportEvent } from "@/telemetry/events";
import {
  awaitElementOnce,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import notify from "@/utils/notify";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { PromiseCancelled, sleep } from "@/utils";
import initialize from "@/vendors/initialize";
import { $safeFind } from "@/helpers";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import pluralize from "@/utils/pluralize";

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
  // `initialize` is triggered when an element is added to the DOM
  | "initialize"
  | "blur"
  | "click"
  | "dblclick"
  | "mouseover"
  | "change";

type IntervalArgs = {
  intervalMillis: number;

  effectGenerator: () => Promise<void>;

  signal: AbortSignal;

  /**
   * Request an animation frame so that animation effects (e.g., confetti) don't pile up while the user is not
   * using the tab/frame running the interval.
   */
  requestAnimationFrame: boolean;
};

async function interval({
  intervalMillis,
  effectGenerator,
  signal,
  requestAnimationFrame,
}: IntervalArgs) {
  while (!signal.aborted) {
    const start = Date.now();

    try {
      if (requestAnimationFrame) {
        // eslint-disable-next-line no-await-in-loop -- intentionally running in sequence
        await new Promise((resolve) => {
          window.requestAnimationFrame(resolve);
        });
      }

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

  abstract get allowBackground(): boolean;

  abstract get targetMode(): TargetMode;

  abstract get triggerSelector(): string | null;

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
   * Controller to drop all listeners and timers
   * @private
   */
  private abortController = new AbortController();

  protected constructor(metadata: Metadata, logger: Logger) {
    super(metadata, logger);

    // Bind so we can pass as callback
    this.boundEventHandler = this.eventHandler.bind(this);
  }

  public get kind(): "trigger" {
    return "trigger";
  }

  async install(): Promise<boolean> {
    return this.isAvailable();
  }

  cancelObservers(): void {
    // Inform registered listeners
    this.abortController.abort();

    // Allow new registrations
    this.abortController = new AbortController();
  }

  addCancelHandler(callback: () => void): void {
    this.abortController.signal.addEventListener("abort", callback);
  }

  removeExtensions(): void {
    // NOP: the removeExtensions method doesn't need to unregister anything from the page because the
    // observers/handlers are installed for the extensionPoint itself, not the extensions. I.e., there's a single
    // load/click/etc. trigger that's shared by all extensions using this extension point.
    console.debug("triggerExtension:removeExtensions");
  }

  override uninstall(): void {
    console.debug("triggerExtension:uninstall", {
      id: this.id,
    });

    // Clean up observers
    this.cancelObservers();

    // Find the latest set of DOM elements and uninstall handlers
    if (this.triggerSelector) {
      // NOTE: you might think we could use a WeakSet of HTMLElement to track which elements we've actually attached
      // DOM events too. However, we can't because WeakSet is not an enumerable collection
      // https://esdiscuss.org/topic/removal-of-weakmap-weakset-clear
      const $currentElements = $safeFind(this.triggerSelector);

      console.debug(
        "Removing %s handler from %d element(s)",
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

    // FIXME: https://github.com/pixiebrix/pixiebrix-extension/issues/2910
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

    await this.runTriggersAndNotify(element);
  };

  /**
   * Run all extensions for a given root (i.e., handle the trigger firing)
   * @return array of errors from the extensions
   * @throws Error on non-extension error, e.g., reader error for the default reader
   */
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

  private async runTriggersAndNotify(...roots: ReaderRoot[]): Promise<void> {
    const promises = roots.map(async (root) => this.runTrigger(root));
    const results = await Promise.allSettled(promises);
    const errors = results.flatMap((x) =>
      // `runTrigger` fulfills with list of extension error from extension, or rejects on other error, e.g., reader
      // error from the extension point.
      x.status === "fulfilled" ? x.value : x.reason
    );

    TriggerExtensionPoint.notifyErrors(errors);
  }

  /**
   * Show notification for errors to the user. Caller is responsible for sending error telemetry.
   * @param errors
   */
  static notifyErrors(errors: unknown[]): void {
    if (errors.length === 0) {
      return;
    }

    const subject = pluralize(errors.length, "a trigger", "$$ triggers");
    const message = `An error occurred running ${subject}`;
    console.debug(message, { errors });
    notify.error({
      message,
      reportError: false,
    });
  }

  private async getRoot(): Promise<JQuery<HTMLElement | Document>> {
    const rootSelector = this.triggerSelector;

    // Await for the element(s) to appear on the page so that we can
    const [rootPromise, cancelRun] = rootSelector
      ? awaitElementOnce(rootSelector)
      : [document, noop];

    this.addCancelHandler(cancelRun);

    try {
      await rootPromise;
    } catch (error) {
      if (error instanceof PromiseCancelled) {
        return;
      }

      throw error;
    }

    // AwaitElementOnce doesn't work with multiple elements. Get everything that's on the current page
    const $root = rootSelector ? $safeFind(rootSelector) : $(document);

    if ($root.length === 0) {
      console.warn("No elements found for trigger selector: %s", rootSelector);
    }

    return $root;
  }

  private attachInterval() {
    this.cancelObservers();

    if (this.intervalMillis > 0) {
      this.logger.debug("Attaching interval trigger");

      const intervalEffect = async () => {
        const $root = await this.getRoot();
        await this.runTriggersAndNotify(...$root);
      };

      void interval({
        intervalMillis: this.intervalMillis,
        effectGenerator: intervalEffect,
        signal: this.abortController.signal,
        requestAnimationFrame: !this.allowBackground,
      });

      console.debug("triggerExtension:attachInterval", {
        intervalMillis: this.intervalMillis,
      });
    } else {
      this.logger.warn(
        "Skipping interval trigger because interval is not greater than zero"
      );
    }
  }

  private attachInitializeTrigger(
    $element: JQuery<Document | HTMLElement>
  ): void {
    this.cancelObservers();

    // The caller will have already waited for the element. So $element will contain at least one element
    if (this.attachMode === "once") {
      void this.runTriggersAndNotify(...$element);
      return;
    }

    const observer = initialize(
      this.triggerSelector,
      (index, element: HTMLElement) => {
        void this.runTriggersAndNotify(element);
      },
      // `target` is a required option
      { target: document }
    );

    this.addCancelHandler(() => {
      observer.disconnect();
    });
  }

  private attachAppearTrigger($element: JQuery): void {
    this.cancelObservers();

    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    const appearObserver = new IntersectionObserver(
      (entries) => {
        const roots = entries
          .filter((x) => x.isIntersecting)
          .map((x) => x.target as HTMLElement);
        void this.runTriggersAndNotify(...roots);
      },
      {
        root: null,
        // RootMargin: "0px",
        threshold: 0.2,
      }
    );

    for (const element of $element) {
      appearObserver.observe(element);
    }

    if (this.attachMode === "watch") {
      const selector = this.triggerSelector;

      console.debug("Watching selector: %s", selector);
      const mutationObserver = initialize(
        selector,
        (index, element) => {
          console.debug("initialize: %s", selector);
          appearObserver.observe(element);
        },
        // `target` is a required option
        { target: document }
      );
      this.addCancelHandler(() => {
        mutationObserver.disconnect();
      });
    }

    this.addCancelHandler(() => {
      appearObserver.disconnect();
    });
  }

  private attachDOMTrigger(
    $element: JQuery,
    { watch = false }: { watch?: boolean }
  ): void {
    // Avoid duplicate events caused by:
    // 1) Navigation events on SPAs where the element remains on the page
    // 2) `watch` mode, because the observer will fire the existing elements on the page. (That re-fire will have
    //  watch: false, see observer handler below.)
    console.debug(
      "Removing existing %s handler for extension point",
      this.trigger
    );
    $element.off(this.trigger, this.boundEventHandler);

    // Install the DOM trigger
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
      // Clear out the existing mutation observer on SPA navigation events.
      // On mutation events, this watch branch is not executed because the mutation handler below passes `watch: false`
      this.cancelObservers();

      // Watch for new elements on the page
      const mutationObserver = initialize(
        this.triggerSelector,
        (index, element) => {
          // Already watching, so don't re-watch on the recursive call
          this.attachDOMTrigger($(element as HTMLElement), { watch: false });
        },
        // `target` is a required option
        { target: document }
      );
      this.addCancelHandler(() => {
        mutationObserver.disconnect();
      });
    }
  }

  private assertElement(
    $root: JQuery<HTMLElement | Document>
  ): asserts $root is JQuery {
    if ($root.get(0) === document) {
      throw new Error(`Trigger ${this.trigger} requires a selector`);
    }
  }

  async run(): Promise<void> {
    this.cancelObservers();

    const $root = await this.getRoot();

    switch (this.trigger) {
      case "load": {
        await this.runTriggersAndNotify(...$root);
        break;
      }

      case "interval": {
        this.attachInterval();
        break;
      }

      case "initialize": {
        this.attachInitializeTrigger($root);
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
   * Allow triggers to run in the background, even when the tab is not active. Currently, only checked for intervals.
   * @since 1.5.3
   */
  background: boolean;

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

  public override get defaultOptions(): Record<string, string> {
    return this._definition.defaultOptions ?? {};
  }

  constructor(config: ExtensionPointConfig<TriggerDefinition>) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    super(cloned.metadata, new BackgroundLogger());
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

  get allowBackground(): boolean {
    return this._definition.background ?? false;
  }

  override async defaultReader() {
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
