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
  isNativeCssSelector,
  awaitElementOnce,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import { notifyError } from "@/contentScript/notify";

// @ts-expect-error using for the EventHandler type below
import JQuery from "jquery";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import { selectEventData } from "@/telemetry/deployments";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { makeServiceContext } from "@/services/serviceUtils";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { PromiseCancelled } from "@/utils";
import initialize from "@/vendors/initialize";

export type TriggerConfig = {
  action: BlockPipeline | BlockConfig;
};

export type AttachMode = "once" | "watch";

export type Trigger =
  // `load` is page load
  | "load"
  // `appear` is triggered when an element enters the user's viewport
  | "appear"
  | "click"
  | "blur"
  | "dblclick"
  | "mouseover"
  | "change";

export abstract class TriggerExtensionPoint extends ExtensionPoint<TriggerConfig> {
  abstract get trigger(): Trigger;

  abstract get attachMode(): AttachMode;

  abstract get triggerSelector(): string | null;

  /**
   * Cancel awaiting the element during this.run()
   * @private
   */
  private cancelRun: (() => void) | null;

  /**
   * Cancel the initialize observer in "watch" attachMode.
   * @private
   */
  private cancelWatch: (() => void) | null;

  private observer: IntersectionObserver | undefined;

  private $installedRoot: JQuery<HTMLElement | Document> | undefined;

  private readonly installedEvents: Set<string> = new Set();

  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faBolt"
  ) {
    super(id, name, description, icon);
    this.cancelRun = null;
    this.cancelWatch = null;
  }

  async install(): Promise<boolean> {
    return this.isAvailable();
  }

  removeExtensions(): void {
    // NOP: the removeExtensions method doesn't need to unregister anything from the page because the
    // observers/handlers are installed for the extensionPoint itself, not the extensions. I.e., there's a single
    // load/click/etc. trigger that's shared by all extensions using this extension point.
  }

  uninstall(): void {
    this.cancelRun?.();
    this.cancelWatch?.();

    try {
      if (this.$installedRoot) {
        // This won't impact with other trigger extension points because the handler is unique to `this`
        for (const event of this.installedEvents) {
          this.$installedRoot.off(event, this.eventHandler);
        }
      }
    } finally {
      this.$installedRoot = null;
      this.installedEvents.clear();
      this.cancelRun = null;
      this.cancelWatch = null;
      this.observer?.disconnect();
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
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
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
    const promises = await Promise.allSettled([this.runTrigger(event.target)]);
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
        } catch (error: unknown) {
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

    this.cancelRun = cancelRun;

    try {
      await rootPromise;
    } catch (error: unknown) {
      if (error instanceof PromiseCancelled) {
        return;
      }

      throw error;
    } finally {
      this.cancelRun = null;
    }

    // AwaitElementOnce doesn't work with multiple elements. Get everything that's on the current page
    const $root = rootSelector ? $(document).find(rootSelector) : $(document);

    if ($root.length === 0) {
      console.warn("No elements found for trigger selector: %s", rootSelector);
    }

    return $root;
  }

  private attachAppearTrigger($element: JQuery): void {
    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

    this.observer?.disconnect();

    this.observer = new IntersectionObserver(
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
      this.observer.observe(element);
    }

    if (this.attachMode === "watch") {
      const selector = this.triggerSelector;

      if (!isNativeCssSelector(selector)) {
        throw new Error(
          `Watch attachMode only supports native browser selectors: ${selector}`
        );
      }

      console.debug("Watching selector: %s", selector);
      const mutationObserver = initialize(
        selector,
        (index, element) => {
          console.debug("initialize: %s", selector);
          this.observer.observe(element);
        },
        { target: document }
      );

      this.cancelWatch = mutationObserver.disconnect.bind(mutationObserver);
    }
  }

  private attachDOMTrigger(
    $element: JQuery,
    { watch = false }: { watch?: boolean }
  ): void {
    if (this.eventHandler) {
      console.debug(
        `Removing existing ${this.trigger} handler for extension point (if it exists)`
      );
      $element.off(this.trigger, null, this.eventHandler);
    }

    this.$installedRoot = $element;
    this.installedEvents.add(this.trigger);

    $element.on(this.trigger, this.eventHandler);
    console.debug(
      `Installed ${this.trigger} event handler on ${$element.length} elements`
    );

    if (watch) {
      if (!isNativeCssSelector(this.triggerSelector)) {
        throw new Error(
          `Watch attachMode only supports native browser selectors: ${this.triggerSelector}`
        );
      }

      this.cancelWatch?.();
      this.cancelWatch = null;

      const mutationObserver = initialize(
        this.triggerSelector,
        (index, element) => {
          // Already watching, so don't re-watch on the recursive call
          this.attachDOMTrigger($(element as HTMLElement), { watch: false });
        },
        { target: document }
      );
      this.cancelWatch = mutationObserver.disconnect.bind(mutationObserver);
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
    this.cancelRun?.();
    this.cancelWatch?.();
    this.cancelRun = null;
    this.cancelWatch = null;
  }

  async run(): Promise<void> {
    this.cancelObservers();

    const $root = await this.getRoot();

    if (this.trigger === "load") {
      const promises = await Promise.allSettled(
        $root.toArray().flatMap(async (root) => this.runTrigger(root))
      );
      TriggerExtensionPoint.notifyErrors(promises);
    } else if (this.trigger === "appear") {
      this.assertElement($root);
      this.attachAppearTrigger($root);
    } else if (this.trigger) {
      this.assertElement($root);
      this.attachDOMTrigger($root, { watch: this.attachMode === "watch" });
    } else {
      throw new Error("No trigger event configured for extension point");
    }
  }
}

type TriggerDefinitionOptions = Record<string, string>;

export interface TriggerDefinition extends ExtensionPointDefinition {
  defaultOptions?: TriggerDefinitionOptions;

  /**
   * The selector for the element to watch for for the trigger.
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
   * The trigger event
   */
  trigger?: Trigger;
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

  get attachMode(): AttachMode {
    return this._definition.attachMode ?? "once";
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
