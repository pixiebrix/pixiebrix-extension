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
import {
  blockList,
  makeServiceContext,
  mergeReaders,
  reducePipeline,
} from "@/blocks/combinators";
import {
  IBlock,
  IExtension,
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
import { Permissions } from "webextension-polyfill-ts";
import { castArray, cloneDeep, compact } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { reportError } from "@/telemetry/logging";
import { reportEvent } from "@/telemetry/events";
import {
  awaitElementOnce,
  selectExtensionContext,
} from "@/extensionPoints/helpers";
import { notifyError } from "@/contentScript/notify";

// @ts-expect-error using for the EventHandler type below
import JQuery from "jquery";
import { BlockConfig, BlockPipeline } from "@/blocks/types";

export type TriggerConfig = {
  action: BlockPipeline | BlockConfig;
};

export type Trigger =
  | "load"
  | "click"
  | "blur"
  | "dblclick"
  | "mouseover"
  | "appear"
  | "change";

export abstract class TriggerExtensionPoint extends ExtensionPoint<TriggerConfig> {
  abstract get trigger(): Trigger;

  private handler: JQuery.EventHandler<unknown> | undefined;

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
  }

  async install(): Promise<boolean> {
    return this.isAvailable();
  }

  removeExtensions(): void {
    // FIXME: implement this to avoid unnecessary firing
    console.warn("removeExtensions not implemented for trigger extensionPoint");
  }

  uninstall(): void {
    try {
      if (this.$installedRoot) {
        for (const event of this.installedEvents) {
          this.$installedRoot.off(event, this.handler);
        }
      }
    } finally {
      this.$installedRoot = null;
      this.installedEvents.clear();
      this.handler = null;
    }
  }

  inputSchema: Schema = propertiesToSchema({
    action: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  async getBlocks(extension: IExtension<TriggerConfig>): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  getTriggerSelector(): string | null {
    return undefined;
  }

  private async runExtension(
    ctxt: ReaderOutput,
    extension: IExtension<TriggerConfig>,
    root: ReaderRoot
  ) {
    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    const { action: actionConfig } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);

    try {
      await reducePipeline(actionConfig, ctxt, extensionLogger, root, {
        validate: true,
        serviceArgs: serviceContext,
        optionsArgs: extension.optionsArgs,
      });
      extensionLogger.info("Successfully ran trigger");
      // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
    } catch (error) {
      extensionLogger.error(error);
    }
  }

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

        reportEvent("TriggerRun", {
          extensionId: extension.id,
        });
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

  async run(): Promise<void> {
    const rootSelector = this.getTriggerSelector();

    // TODO: add logic for cancelWait
    const [rootPromise] = rootSelector
      ? awaitElementOnce(rootSelector)
      : [$(document)];

    let $root = await rootPromise;

    if (rootSelector) {
      // AwaitElementOnce doesn't work with multiple elements. Get what's currently on the page
      // eslint-disable-next-line unicorn/no-array-callback-reference -- false positive for JQuery
      $root = $(document).find(rootSelector);
    }

    if ($root.length === 0) {
      console.warn(`No elements found for trigger selector: ${rootSelector}`);
    }

    if (this.trigger === "load") {
      const promises = await Promise.allSettled(
        $root.toArray().flatMap(async (root) => this.runTrigger(root))
      );
      TriggerExtensionPoint.notifyErrors(promises);
    } else if (this.trigger === "appear") {
      if (rootSelector == null) {
        throw new Error("'appear' trigger not valid for document");
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
      if (this.observer != null) {
        this.observer.disconnect();
      }

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

      for (const root of $root) {
        this.observer.observe(root as HTMLElement);
      }
    } else if (this.trigger) {
      if (rootSelector == null) {
        throw new Error(
          `Trigger not supported for the document: ${this.trigger}`
        );
      }

      const $rootElement = $root as JQuery;

      if (this.handler) {
        console.debug(
          `Removing existing ${this.trigger} handler for extension point`
        );
        $rootElement.off(this.trigger, null, this.handler);
      }

      this.handler = async (event) => {
        const promises = await Promise.allSettled([
          this.runTrigger(event.target),
        ]);
        TriggerExtensionPoint.notifyErrors(compact(promises));
      };

      this.$installedRoot = $root;
      this.installedEvents.add(this.trigger);

      $rootElement.on(this.trigger, this.handler);
      console.debug(
        `Installed ${this.trigger} event handler on ${$root.length} elements`
      );
    } else {
      throw new Error("No trigger event configured for extension point");
    }
  }
}

type TriggerDefinitionOptions = Record<string, string>;

export interface TriggerDefinition extends ExtensionPointDefinition {
  defaultOptions?: TriggerDefinitionOptions;
  rootSelector?: string;
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

  getTriggerSelector(): string | null {
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
