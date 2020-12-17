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

// @ts-ignore: using for the EventHandler type below
import JQuery from "jquery";

export interface TriggerConfig {
  action: BlockPipeline | BlockConfig;
}

export type Trigger = "load" | "click" | "dblclick" | "mouseover";

export abstract class TriggerExtensionPoint extends ExtensionPoint<TriggerConfig> {
  abstract get trigger(): Trigger;

  private handler: JQuery.EventHandler<unknown> | undefined;
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
    return await this.isAvailable();
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

  getTriggerRoot(): JQuery<HTMLElement | Document> {
    return $(document);
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
          extensionId: extension.id,
        });
        try {
          await this.runExtension(readerContext, extension, root);
        } catch (ex) {
          // eslint-disable-next-line require-await
          reportError(ex, extensionLogger.context);
          return ex;
        }
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
      $.notify(`An error occurred running ${errors.length} triggers(s)`, {
        className: "error",
      });
    }
  }

  async run(): Promise<void> {
    const $root = this.getTriggerRoot();

    if ($root.length === 0) {
      this.logger.warn("No root elements found");
    }

    if (this.trigger === "load") {
      const promises = await Promise.allSettled(
        $root.toArray().flatMap((root) => this.runTrigger(root))
      );
      TriggerExtensionPoint.notifyErrors(promises);
    } else if (this.trigger) {
      this.handler = async (event) => {
        const promises = await Promise.allSettled([
          this.runTrigger(event.target),
        ]);
        TriggerExtensionPoint.notifyErrors(compact(promises));
      };

      this.$installedRoot = $root;
      this.installedEvents.add(this.trigger);
      $root.on(this.trigger, this.handler);
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

  getTriggerRoot(): JQuery<HTMLElement | Document> {
    return this._definition.rootSelector
      ? $(this._definition.rootSelector)
      : $(document);
  }

  defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  async isAvailable(): Promise<boolean> {
    return await checkAvailable(this._definition.isAvailable);
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
