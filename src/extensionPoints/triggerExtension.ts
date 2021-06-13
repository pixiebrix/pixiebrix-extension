/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ExtensionPoint } from "@/types";
import {
  reducePipeline,
  blockList,
  BlockPipeline,
  BlockConfig,
  makeServiceContext,
  mergeReaders,
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
import { compact, castArray } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { reportError } from "@/telemetry/logging";
import { reportEvent } from "@/telemetry/events";
// @ts-ignore: using for the EventHandler type below
import JQuery from "jquery";
import { awaitElementOnce } from "@/extensionPoints/helpers";
import { notifyError } from "@/contentScript/notify";

export interface TriggerConfig {
  action: BlockPipeline | BlockConfig;
}

export type Trigger = "load" | "click" | "dblclick" | "mouseover" | "appear";

export abstract class TriggerExtensionPoint extends ExtensionPoint<TriggerConfig> {
  abstract get trigger(): Trigger;

  private handler: JQuery.EventHandler<unknown> | undefined;
  private observer: IntersectionObserver | undefined;
  private $installedRoot: JQuery<HTMLElement | Document> | undefined;
  private installedEvents: Set<string> = new Set();

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
    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });

    const { action: actionConfig } = extension.config;

    const serviceContext = await makeServiceContext(extension.services);

    try {
      await reducePipeline(actionConfig, ctxt, extensionLogger, root, {
        validate: true,
        serviceArgs: serviceContext,
        optionsArgs: extension.optionsArgs,
      });
      extensionLogger.info("Successfully ran trigger");
    } catch (ex) {
      extensionLogger.error(ex);
    }
  }

  private async runTrigger(root: ReaderRoot): Promise<unknown[]> {
    const reader = await this.defaultReader();
    const readerContext = await reader.read(root);
    const errors = await Promise.all(
      this.extensions.map(async (extension) => {
        const extensionLogger = this.logger.childLogger({
          deploymentId: extension._deployment?.id,
          extensionId: extension.id,
        });
        try {
          await this.runExtension(readerContext, extension, root);
        } catch (ex) {
          // eslint-disable-next-line require-await
          reportError(ex, extensionLogger.context);
          return ex;
        }
        reportEvent("TriggerRun", {
          extensionId: extension.id,
        });
      })
    );
    return compact(errors);
  }

  static notifyErrors(results: PromiseSettledResult<unknown[]>[]): void {
    const errors = compact(
      results.flatMap((x) => (x.status === "fulfilled" ? x.value : [x.reason]))
    );
    if (errors.length) {
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
      // awaitElementOnce doesn't work with multiple elements. Get what's currently on the page
      $root = $(document).find(rootSelector);
    }

    if ($root.length === 0) {
      console.warn(`No elements found for trigger selector: ${rootSelector}`);
    }

    if (this.trigger === "load") {
      const promises = await Promise.allSettled(
        $root.toArray().flatMap((root) => this.runTrigger(root))
      );
      TriggerExtensionPoint.notifyErrors(promises);
    } else if (this.trigger === "appear") {
      if (rootSelector == null) {
        throw new Error("'appear' trigger not valid for document");
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
      this.observer?.disconnect();

      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries.filter((x) => x.isIntersecting)) {
            this.runTrigger(entry.target as HTMLElement).then((errors) => {
              if (errors.length) {
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
          // rootMargin: "0px",
          threshold: 0.2,
        }
      );

      $root.toArray().forEach((root) => {
        this.observer.observe(root as HTMLElement);
      });
    } else if (this.trigger) {
      if (rootSelector == null) {
        throw new Error(
          `Trigger not supported for the document: ${this.trigger}`
        );
      }

      const $rootElement = $root as JQuery<HTMLElement>;

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

interface TriggerDefinitionOptions {
  [option: string]: string;
}

export interface TriggerDefinition extends ExtensionPointDefinition {
  defaultOptions?: TriggerDefinitionOptions;
  rootSelector?: string;
  trigger?: Trigger;
}

class RemoteTriggerExtensionPoint extends TriggerExtensionPoint {
  private readonly _definition: TriggerDefinition;
  public readonly permissions: Permissions.Permissions;

  public get defaultOptions(): {
    [option: string]: string;
  } {
    return this._definition.defaultOptions ?? {};
  }

  constructor(config: ExtensionPointConfig<TriggerDefinition>) {
    const { id, name, description, icon } = config.metadata;
    super(id, name, description, icon);
    this._definition = config.definition;
    const { isAvailable } = config.definition;
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

  defaultReader() {
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
