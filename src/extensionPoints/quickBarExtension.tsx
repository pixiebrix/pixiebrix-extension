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

import React from "react";
import { InitialValues, reducePipeline } from "@/runtime/reducePipeline";
import { ExtensionPoint } from "@/types";
import {
  IBlock,
  IconConfig,
  IExtensionPoint,
  IReader,
  ResolvedExtension,
  Schema,
  UUID,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { Manifest, Menus, Permissions } from "webextension-polyfill";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { castArray, cloneDeep, isEmpty } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { reportError } from "@/telemetry/logging";
import { notifyError } from "@/contentScript/notify";
import { reportEvent } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { BusinessError, isErrorObject } from "@/errors";
import { BlockConfig, BlockPipeline } from "@/blocks/types";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { blockList } from "@/blocks/util";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import { makeServiceContext } from "@/services/serviceUtils";
import { initQuickBarApp } from "@/components/quickBar/QuickBarApp";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import { guessSelectedElement } from "@/utils/selectionController";

export type QuickBarTargetMode = "document" | "eventTarget";

export type QuickBarConfig = {
  title: string;

  /**
   * (Optional) the icon to supply to the icon in the extension point template
   */
  icon?: IconConfig;

  action: BlockConfig | BlockPipeline;
};

export abstract class QuickBarExtensionPoint extends ExtensionPoint<QuickBarConfig> {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon = "faMousePointer"
  ) {
    super(id, name, description, icon);
  }

  public get syncInstall() {
    return true;
  }

  abstract get targetMode(): QuickBarTargetMode;

  abstract getBaseReader(): Promise<IReader>;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  abstract readonly contexts: Menus.ContextType[];

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description:
          "The text to display in the item. When the context is selection, use %s within the string to show the selected text.",
      },
      action: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/effect#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
    },
    ["title", "action"]
  );

  async getBlocks(
    extension: ResolvedExtension<QuickBarConfig>
  ): Promise<IBlock[]> {
    return blockList(extension.config.action);
  }

  uninstall(): void {
    for (const extension of this.extensions) {
      quickBarRegistry.remove(extension.id);
    }
  }

  removeExtensions(extensionIds: UUID[]): void {
    for (const extensionId of extensionIds) {
      quickBarRegistry.remove(extensionId);
    }
  }

  async install(): Promise<boolean> {
    initQuickBarApp();
    const available = await this.isAvailable();
    await this.registerExtensions();
    return available;
  }

  async defaultReader(): Promise<IReader> {
    return this.getBaseReader();
  }

  private async registerExtensions(): Promise<void> {
    const results = await Promise.allSettled(
      this.extensions.map(async (extension) => {
        try {
          await this.registerExtension(extension);
        } catch (error) {
          reportError(error, {
            deploymentId: extension._deployment?.id,
            extensionPointId: extension.extensionPointId,
            extensionId: extension.id,
          });
          throw error;
        }
      })
    );

    const numErrors = results.filter((x) => x.status === "rejected").length;
    if (numErrors > 0) {
      notifyError(`An error occurred adding ${numErrors} quick bar items(s)`);
    }
  }

  decideReaderRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget":
        return target;
      case "document":
        return document;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
    }
  }

  decidePipelineRoot(target: HTMLElement | Document): HTMLElement | Document {
    switch (this.targetMode) {
      case "eventTarget":
        return target;
      case "document":
        return document;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
        throw new BusinessError(`Unknown targetMode: ${this.targetMode}`);
    }
  }

  private async registerExtension(
    extension: ResolvedExtension<QuickBarConfig>
  ): Promise<void> {
    const {
      title: name,
      action: actionConfig,
      icon: iconConfig,
    } = extension.config;

    const icon = iconConfig ? (
      <Icon icon={iconConfig.id} library={iconConfig.library} />
    ) : undefined;

    quickBarRegistry.add({
      id: extension.id,
      name,
      icon,
      perform: async () => {
        reportEvent("HandleQuickBar", selectEventData(extension));

        try {
          const reader = await this.getBaseReader();
          const serviceContext = await makeServiceContext(extension.services);

          const targetElement = guessSelectedElement() ?? document;

          const input = {
            ...(await reader.read(this.decideReaderRoot(targetElement))),
            // Add some additional data that people will generally want
            documentUrl: document.location.href,
          };

          const initialValues: InitialValues = {
            input,
            root: this.decidePipelineRoot(targetElement),
            serviceContext,
            optionsArgs: extension.optionsArgs,
          };

          await reducePipeline(actionConfig, initialValues, {
            logger: extensionLogger,
            ...apiVersionOptions(extension.apiVersion),
          });
        } catch (error) {
          if (isErrorObject(error)) {
            reportError(error);
            extensionLogger.error(error);
          } else {
            extensionLogger.warn(error as any);
          }

          throw error;
        }
      },
    });

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    console.debug(
      "Register quick bar action handler for: %s (%s)",
      extension.id,
      extension.label ?? "No Label",
      {
        extension,
      }
    );
  }

  async run(): Promise<void> {
    if (this.extensions.length === 0) {
      console.debug(
        `contextMenu extension point ${this.id} has no installed extensions`
      );
      return;
    }

    await this.registerExtensions();
  }
}

export type QuickBarDefaultOptions = {
  title?: string;
  [key: string]: string | string[];
};

export interface QuickBarDefinition extends ExtensionPointDefinition {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: QuickBarTargetMode;
  defaultOptions?: QuickBarDefaultOptions;
}

class RemoteQuickBarExtensionPoint extends QuickBarExtensionPoint {
  private readonly _definition: QuickBarDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly contexts: Menus.ContextType[];

  public readonly rawConfig: ExtensionPointConfig<QuickBarDefinition>;

  constructor(config: ExtensionPointConfig<QuickBarDefinition>) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    const { id, name, description, icon } = cloned.metadata;
    super(id, name, description, icon);
    this._definition = cloned.definition;
    this.rawConfig = cloned;
    const { isAvailable, documentUrlPatterns, contexts } = cloned.definition;
    // If documentUrlPatterns not specified show everywhere
    this.documentUrlPatterns = castArray(documentUrlPatterns ?? ["*://*/*"]);
    this.contexts = castArray(contexts);
    this.permissions = {
      origins: isAvailable?.matchPatterns
        ? castArray(isAvailable.matchPatterns)
        : [],
    };
  }

  get targetMode(): QuickBarTargetMode {
    return this._definition.targetMode ?? "eventTarget";
  }

  async isAvailable(): Promise<boolean> {
    if (
      !isEmpty(this._definition.isAvailable) &&
      (await checkAvailable(this._definition.isAvailable))
    ) {
      return true;
    }

    return checkAvailable({
      matchPatterns: this._definition.documentUrlPatterns,
    });
  }

  async getBaseReader() {
    return mergeReaders(this._definition.reader);
  }

  public get defaultOptions(): {
    title: string;
    [key: string]: string | string[];
  } {
    return {
      title: "PixieBrix",
      ...this._definition.defaultOptions,
    };
  }
}

export function fromJS(
  config: ExtensionPointConfig<QuickBarDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "quickBar") {
    throw new Error(`Expected type=quickBar, got ${type}`);
  }

  return new RemoteQuickBarExtensionPoint(config);
}
