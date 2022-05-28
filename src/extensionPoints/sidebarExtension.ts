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
  Schema,
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
} from "@/contentScript/sidebar";
import Mustache from "mustache";
import { uuidv4 } from "@/types/helpers";
import { getErrorMessage } from "@/errors";
import { HeadlessModeError } from "@/blocks/errors";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import { cloneDeep } from "lodash";
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

export abstract class SidebarExtensionPoint extends ExtensionPoint<SidebarConfig> {
  readonly permissions: Permissions.Permissions = {};

  readonly showCallback: ShowCallback;

  protected constructor(metadata: Metadata, logger: Logger) {
    super(metadata, logger);
    this.showCallback = SidebarExtensionPoint.prototype.run.bind(this);
  }

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
      const ref = { extensionId: extension.id, extensionPointId: this.id };

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

  async run(extensionIds?: string[]): Promise<void> {
    if (!(await this.isAvailable())) {
      removeExtensionPoint(this.id);
      return;
    }

    if (this.extensions.length === 0) {
      console.debug(
        "sidebar extension point %s has no installed extensions",
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
      }))
    );

    const reader = await this.defaultReader();

    const readerContext = await reader.read(document);
    if (readerContext == null) {
      throw new Error("Reader returned null/undefined");
    }

    const errors: unknown[] = [];

    const toRun = this.extensions.filter(
      (x) => extensionIds == null || extensionIds.includes(x.id)
    );

    // OK to run in parallel because we've fixed the order the panels appear in reservePanels
    await Promise.all(
      toRun.map(async (extension) => {
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

  async install(): Promise<boolean> {
    const available = await this.isAvailable();
    if (available) {
      registerShowCallback(this.showCallback);
    } else {
      removeExtensionPoint(this.id);
    }

    return available;
  }
}

export type PanelDefinition = ExtensionPointDefinition;

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
