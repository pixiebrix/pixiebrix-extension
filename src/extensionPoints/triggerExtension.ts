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

import {
  type InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";

import { propertiesToSchema } from "@/validators/generic";
import {
  type CustomEventOptions,
  type DebounceOptions,
  ExtensionPoint,
  type ExtensionPointConfig,
  type ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { type Permissions } from "webextension-polyfill";
import { castArray, cloneDeep, compact, debounce, isEmpty, noop } from "lodash";
import { checkAvailable } from "@/blocks/available";
import reportError from "@/telemetry/reportError";
import { reportEvent } from "@/telemetry/events";
import {
  awaitElementOnce,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import notify from "@/utils/notify";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { sleep, waitAnimationFrame } from "@/utils";
import initialize from "@/vendors/initialize";
import { $safeFind } from "@/helpers";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import pluralize from "@/utils/pluralize";
import { PromiseCancelled } from "@/errors/genericErrors";
import { BusinessError } from "@/errors/businessErrors";
import { guessSelectedElement } from "@/utils/selectionController";
import "@/vendors/hoverintent/hoverintent";
import ArrayCompositeReader from "@/blocks/readers/ArrayCompositeReader";
import {
  type AttachMode,
  type IntervalArgs,
  type ReportMode,
  type TargetMode,
  type Trigger,
  USER_ACTION_TRIGGERS,
} from "@/extensionPoints/triggerExtensionTypes";
import {
  getEventReader,
  getShimEventReader,
  pickEventProperties,
} from "@/extensionPoints/triggerEventReaders";
import CompositeReader from "@/blocks/readers/CompositeReader";
import { type IReader } from "@/types/blocks/readerTypes";
import { type UUID } from "@/types/stringTypes";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { type IBlock } from "@/types/blockTypes";
import { type Schema } from "@/types/schemaTypes";
import { type SelectorRoot } from "@/types/runtimeTypes";
import { type JsonObject } from "type-fest";
import { type IExtensionPoint } from "@/types/extensionPointTypes";

export type TriggerConfig = {
  action: BlockPipeline | BlockConfig;
};

export function getDefaultReportModeForTrigger(trigger: Trigger): ReportMode {
  return USER_ACTION_TRIGGERS.includes(trigger) ? "all" : "once";
}

async function interval({
  intervalMillis,
  effectGenerator,
  signal,
  requestAnimationFrame,
}: IntervalArgs) {
  // Don't run the effect immediately. Wait for the interval first. In the future we might consider adding a "leading"
  // boolean argument to control whether the interval fires immediately
  await sleep(intervalMillis);

  while (!signal.aborted) {
    const start = Date.now();

    try {
      if (requestAnimationFrame) {
        // eslint-disable-next-line no-await-in-loop -- intentionally running in sequence
        await waitAnimationFrame();
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

  abstract get reportMode(): ReportMode;

  abstract get debounceOptions(): DebounceOptions;

  abstract get customTriggerOptions(): CustomEventOptions;

  abstract get triggerSelector(): string | null;

  abstract getBaseReader(): Promise<IReader>;

  /**
   * Map from extension ID to elements a trigger is currently running on.
   * @private
   */
  private readonly runningExtensionElements = new Map<
    UUID,
    WeakSet<Document | HTMLElement>
  >();

  /**
   * Installed DOM event listeners, e.g., `click`
   * @private
   */
  // XXX: does this need to be a set? Shouldn't there only ever be 1 trigger since the trigger is defined on the
  // extension point?
  private readonly installedEvents = new Set<string>();

  /**
   * Controller to drop all listeners and timers
   * @private
   */
  private abortController = new AbortController();

  // Extensions that have errors/events reported. NOTE: this tracked per contentScript instance. These are not
  // reset on Single Page Application navigation events
  private readonly reportedEvents = new Set<UUID>();
  private readonly reportedErrors = new Set<UUID>();

  public get kind(): "trigger" {
    return "trigger";
  }

  private shouldReport(alreadyReported: boolean): boolean {
    switch (this.reportMode) {
      case "once": {
        return !alreadyReported;
      }

      case "all": {
        return true;
      }

      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Invalid reportMode: ${this.reportMode}`);
      }
    }
  }

  private shouldReportError(extensionId: UUID): boolean {
    const alreadyReported = this.reportedErrors.has(extensionId);
    this.reportedErrors.add(extensionId);
    return this.shouldReport(alreadyReported);
  }

  private shouldReportEvent(extensionId: UUID): boolean {
    const alreadyReported = this.reportedEvents.has(extensionId);
    this.reportedEvents.add(extensionId);
    return this.shouldReport(alreadyReported);
  }

  async install(): Promise<boolean> {
    if (this.debounceOptions?.waitMillis) {
      const { waitMillis, ...options } = this.debounceOptions;
      this.debouncedRunTriggersAndNotify = debounce(
        this._runTriggersAndNotify,
        waitMillis,
        options
      );
    }

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
            $currentElements.off(event, this.eventHandler);
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

  override async defaultReader(): Promise<IReader> {
    const eventReader = getEventReader(this.trigger);

    return new ArrayCompositeReader(
      compact([
        // Because defaultReader is used outputSchema, only include eventReader if it's actually applicable so
        // @input.event doesn't show up in autocomplete/etc. otherwise
        eventReader ? new CompositeReader({ event: eventReader }) : null,
        await this.getBaseReader(),
      ])
    );
  }

  override async previewReader(): Promise<IReader> {
    const shim = getShimEventReader(this.trigger) as IReader;

    return new ArrayCompositeReader(
      compact([
        shim ? new CompositeReader({ event: shim }) : null,
        await this.getBaseReader(),
      ])
    );
  }

  private async runExtension(
    ctxt: JsonObject,
    extension: ResolvedExtension<TriggerConfig>,
    root: SelectorRoot
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
      await reduceExtensionPipeline(actionConfig, initialValues, {
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
   */
  private readonly eventHandler: JQuery.EventHandler<unknown> = async (
    event
  ) => {
    console.debug("Handling DOM event", {
      target: event.target,
      event,
    });

    let element: HTMLElement | Document = event.target;

    if (this.trigger === "selectionchange") {
      element = guessSelectedElement() ?? document;
    }

    if (this.targetMode === "root") {
      element = $(event.target).closest(this.triggerSelector).get(0);
      console.debug(
        "Locating closest element for target: %s",
        this.triggerSelector
      );
    }

    await this.debouncedRunTriggersAndNotify([element], {
      nativeEvent: event.originalEvent,
    });
  };

  /**
   * Mark a run as in-progress for an extension. Used to enforce synchronous execution of an
   * extension on a particular element.
   * @param extensionId the UUID of the extension
   * @param element the element the extension is running against
   * @private
   */
  private markRun(extensionId: UUID, element: Document | HTMLElement): void {
    if (this.runningExtensionElements.has(extensionId)) {
      this.runningExtensionElements.get(extensionId).add(element);
    } else {
      this.runningExtensionElements.set(extensionId, new Set([element]));
    }
  }

  /**
   * Run all extensions for a given root (i.e., handle the trigger firing).
   *
   * DO NOT CALL DIRECTLY: should only be called from runTriggersAndNotify
   *
   * @return array of errors from the extensions
   * @throws Error on non-extension error, e.g., reader error for the default reader
   */
  private async _runTrigger(
    root: SelectorRoot,
    // Force parameter to be included to make it explicit which types of triggers pass nativeEvent
    {
      nativeEvent,
    }: {
      nativeEvent: Event | null;
    }
  ): Promise<unknown[]> {
    let extensionsToRun = this.extensions;

    if (this.trigger === "hover") {
      // Enforce synchronous behavior for `hover` event
      extensionsToRun = extensionsToRun.filter(
        (extension) =>
          !this.runningExtensionElements.get(extension.id)?.has(root)
      );
    }

    // Don't bother running the reader if no extensions match
    if (extensionsToRun.length === 0) {
      return [];
    }

    const reader = await this.getBaseReader();

    const readerContext = {
      // The default reader overrides the event property. Should match the override precedence in defaultReader()
      event: nativeEvent ? pickEventProperties(nativeEvent) : null,
      ...(await reader.read(root)),
    };

    const errors = await Promise.all(
      extensionsToRun.map(async (extension) => {
        const extensionLogger = this.logger.childLogger(
          selectExtensionContext(extension)
        );
        try {
          this.markRun(extension.id, root);
          await this.runExtension(readerContext, extension, root);
        } catch (error) {
          if (this.shouldReportError(extension.id)) {
            reportError(error, { context: extensionLogger.context });
          }

          return error;
        } finally {
          // NOTE: if the extension is not running with synchronous behavior, there's a race condition where
          // the `delete` could be called while another extension run is still in progress
          this.runningExtensionElements.get(extension.id).delete(root);
          console.debug("Cleaning up runningExtensionElements", extension.id, {
            root,
          });
        }

        if (this.shouldReportEvent(extension.id)) {
          reportEvent("TriggerRun", selectEventData(extension));
        }
      })
    );
    return compact(errors);
  }

  /**
   * DO NOT CALL DIRECTLY: should call debouncedRunTriggersAndNotify.
   */
  private readonly _runTriggersAndNotify = async (
    roots: SelectorRoot[],
    // Force parameter to be included to make it explicit which types of triggers pass nativeEvent
    { nativeEvent }: { nativeEvent: Event | null }
  ): Promise<void> => {
    const promises = roots.map(async (root) =>
      this._runTrigger(root, { nativeEvent })
    );
    const results = await Promise.allSettled(promises);
    const errors = results.flatMap((x) =>
      // `runTrigger` fulfills with list of extension error from extension, or rejects on other error, e.g., reader
      // error from the extension point.
      x.status === "fulfilled" ? x.value : x.reason
    );

    TriggerExtensionPoint.notifyErrors(errors);
  };

  /**
   * Run all trigger extensions for all the provided roots.
   * @private
   */
  private debouncedRunTriggersAndNotify = this._runTriggersAndNotify; // Default to un-debounced

  /**
   * Show notification for errors to the user. Caller is responsible for sending error telemetry.
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
    const [rootPromise, cancelRun] = isEmpty(rootSelector)
      ? [document, noop]
      : awaitElementOnce(rootSelector);

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
    const $root = isEmpty(rootSelector) ? $(document) : $safeFind(rootSelector);

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
        await this.debouncedRunTriggersAndNotify([...$root], {
          nativeEvent: null,
        });
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
    $elements: JQuery<Document | HTMLElement>
  ): void {
    this.cancelObservers();

    // The caller will have already waited for the element. So $element will contain at least one element
    if (this.attachMode === "once") {
      void this.debouncedRunTriggersAndNotify([...$elements], {
        nativeEvent: null,
      });
      return;
    }

    const observer = initialize(
      this.triggerSelector,
      (index, element: HTMLElement) => {
        void this.debouncedRunTriggersAndNotify([element], {
          nativeEvent: null,
        });
      },
      // `target` is a required option
      { target: document }
    );

    this.addCancelHandler(() => {
      observer.disconnect();
    });
  }

  private attachAppearTrigger($elements: JQuery): void {
    this.cancelObservers();

    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    const appearObserver = new IntersectionObserver(
      (entries) => {
        const roots = entries
          .filter((x) => x.isIntersecting)
          .map((x) => x.target as HTMLElement);
        void this.debouncedRunTriggersAndNotify(roots, { nativeEvent: null });
      },
      {
        root: null,
        // RootMargin: "0px",
        threshold: 0.2,
      }
    );

    for (const element of $elements) {
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

  private attachDocumentTrigger(): void {
    const $document = $(document);

    $document.off(this.trigger, this.eventHandler);

    // Install the DOM trigger
    $document.on(this.trigger, this.eventHandler);

    this.installedEvents.add(this.trigger);

    this.addCancelHandler(() => {
      $document.off(this.trigger, this.eventHandler);
    });
  }

  private attachDOMTrigger(
    $elements: JQuery<HTMLElement | Document>,
    { watch = false }: { watch?: boolean }
  ): void {
    const domTrigger =
      this.trigger === "custom"
        ? this.customTriggerOptions?.eventName
        : this.trigger;

    if (!domTrigger) {
      throw new BusinessError("No trigger event configured for starter brick");
    }

    // Avoid duplicate events caused by:
    // 1) Navigation events on SPAs where the element remains on the page
    // 2) `watch` mode, because the observer will fire the existing elements on the page. (That re-fire will have
    //  watch: false, see observer handler below.)
    console.debug(
      "Removing existing %s handler for extension point",
      this.trigger
    );

    if (domTrigger === "hover") {
      // `hoverIntent` JQuery plugin has custom event names
      $elements.off("mouseenter.hoverIntent");
      $elements.off("mouseleave.hoverIntent");
      $elements.hoverIntent({
        over: this.eventHandler,
        // If `out` is not provided, over is called on both mouseenter and mouseleave
        out: noop,
      });
    } else {
      $elements.off(domTrigger, this.eventHandler);
      $elements.on(domTrigger, this.eventHandler);
    }

    this.installedEvents.add(domTrigger);

    console.debug(
      "Installed %s event handler on %d elements",
      domTrigger,
      $elements.length,
      {
        trigger: domTrigger,
        selector: this.triggerSelector,
        targetMode: this.targetMode,
        watch,
      }
    );

    if (watch) {
      if ($elements.get(0) === document) {
        console.warn("Ignoring watchMode for document target");
        return;
      }

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
        await this.debouncedRunTriggersAndNotify([...$root], {
          nativeEvent: null,
        });
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

      case "selectionchange": {
        this.attachDocumentTrigger();
        break;
      }

      case "statechange": {
        this.attachDocumentTrigger();
        break;
      }

      case "custom": {
        this.attachDOMTrigger($root, { watch: false });
        break;
      }

      default: {
        if (this.trigger) {
          this.assertElement($root);
          this.attachDOMTrigger($root, { watch: this.attachMode === "watch" });
        } else {
          throw new BusinessError(
            "No trigger event configured for starter brick"
          );
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
   * Flag to control if all trigger fires/errors for an extension are reported.
   *
   * If not provided, defaults based on the trigger type:
   * - User action (e.g., click): all
   * - Automatic actions: once
   *
   * @see ReportMode
   * @see USER_ACTION_TRIGGERS
   * @since 1.6.4
   */
  reportMode?: ReportMode;

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

  /**
   * For `custom` trigger, the custom event trigger options.
   *
   * @since 1.6.5
   */
  customEvent?: CustomEventOptions;

  /**
   * Debounce the trigger for the extension point.
   */
  debounce?: DebounceOptions;
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

  get debounceOptions(): DebounceOptions | null {
    return this._definition.debounce;
  }

  get customTriggerOptions(): CustomEventOptions | null {
    return this._definition.customEvent;
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

  get reportMode(): ReportMode {
    return (
      this._definition.reportMode ??
      getDefaultReportModeForTrigger(this.trigger)
    );
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

  override async getBaseReader(): Promise<IReader> {
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
