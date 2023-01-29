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
  type IBlock,
  type IExtensionPoint,
  type ResolvedExtension,
  type RunArgs,
  RunReason,
  type Schema,
  type UUID,
} from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPoint,
  type ExtensionPointConfig,
  type ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { type Permissions } from "webextension-polyfill";
import { castArray, cloneDeep } from "lodash";
import { checkAvailable } from "@/blocks/available";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import { blockList } from "@/blocks/util";
import { mergeReaders } from "@/blocks/readers/readerUtils";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import "@/vendors/hoverintent/hoverintent";
import { selectExtensionContext } from "@/extensionPoints/helpers";
import {
  type InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import { makeServiceContext } from "@/services/serviceUtils";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import {
  cancelAllTours,
  isTourInProgress,
  type RegisteredTour,
  registerTour,
  unregisterTours,
} from "@/extensionPoints/tourController";

export type TourConfig = {
  tour: BlockPipeline | BlockConfig;
};

export abstract class TourExtensionPoint extends ExtensionPoint<TourConfig> {
  public get kind(): "tour" {
    return "tour";
  }

  readonly extensionTours = new Map<UUID, RegisteredTour>();

  async install(): Promise<boolean> {
    return this.isAvailable();
  }

  removeExtensions(): void {
    // NOP: the removeExtensions method doesn't need to unregister anything from the page because the
    // observers/handlers are installed for the extensionPoint itself, not the extensions. I.e., there's a single
    // load/click/etc. trigger that's shared by all extensions using this extension point.
    console.debug("tourExtension:removeExtensions");
  }

  override uninstall(): void {
    console.debug("tourExtension:uninstall", {
      id: this.id,
    });
    unregisterTours([...this.extensionTours.keys()]);
  }

  inputSchema: Schema = propertiesToSchema({
    tour: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  async getBlocks(extension: ResolvedExtension<TourConfig>): Promise<IBlock[]> {
    return blockList(extension.config.tour);
  }

  private async runExtensionTour(
    extension: ResolvedExtension<TourConfig>,
    abortController: AbortController
  ): Promise<void> {
    const reader = await this.defaultReader();
    const { tour: tourConfig } = extension.config;
    const ctxt = await reader.read(document);

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension)
    );

    const initialValues: InitialValues = {
      input: ctxt,
      root: document,
      serviceContext: await makeServiceContext(extension.services),
      optionsArgs: extension.optionsArgs,
    };

    await reduceExtensionPipeline(tourConfig, initialValues, {
      logger: extensionLogger,
      ...apiVersionOptions(extension.apiVersion),
      abortSignal: abortController.signal,
    });
  }

  /**
   * Register a tour with the tour controller.
   * @param extension the tour extension
   * @private
   */
  private registerTour(extension: ResolvedExtension<TourConfig>): void {
    const tour = registerTour({
      blueprintId: extension._recipe?.id,
      extension,
      run: () => {
        const abortController = new AbortController();
        const promise = this.runExtensionTour(extension, abortController);
        return { promise, abortController };
      },
    });

    this.extensionTours.set(extension.id, tour);
  }

  /**
   * Decide which tour to run.
   * TODO: implement logic to decide which tour to run by referencing schedule and user's tour history.
   */
  decideTour(): ResolvedExtension<TourConfig> {
    if (this.extensions.length > 0) {
      return this.extensions[0];
    }

    return null;
  }

  async run({ reason }: RunArgs): Promise<void> {
    // User requested the tour run from the Page Editor
    // XXX: do we need to do any extra logic in decideTour to force the tour they're editing?
    if (reason === RunReason.PAGE_EDITOR) {
      cancelAllTours();
    }

    // Always ensure all tours are registered
    for (const extension of this.extensions) {
      this.registerTour(extension);
    }

    if (isTourInProgress()) {
      // XXX: this logic needs to account for sub-tour calls. Use RunReason?
      console.debug("Tour already in progress, skipping %s", this.id);
      return;
    }

    const extension = this.decideTour();

    if (extension) {
      this.extensionTours.get(extension.id).run();
    }
  }
}

type TourDefinitionOptions = Record<string, string>;

export interface TourDefinition extends ExtensionPointDefinition {
  defaultOptions?: TourDefinitionOptions;
}

class RemoteTourExtensionPoint extends TourExtensionPoint {
  private readonly _definition: TourDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: ExtensionPointConfig<TourDefinition>;

  public override get defaultOptions(): Record<string, string> {
    return this._definition.defaultOptions ?? {};
  }

  constructor(config: ExtensionPointConfig<TourDefinition>) {
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

  override async defaultReader() {
    return mergeReaders(this._definition.reader);
  }

  async isAvailable(): Promise<boolean> {
    return checkAvailable(this._definition.isAvailable);
  }
}

export function fromJS(
  config: ExtensionPointConfig<TourDefinition>
): IExtensionPoint {
  const { type } = config.definition;
  if (type !== "tour") {
    throw new Error(`Expected type=tour, got ${type}`);
  }

  return new RemoteTourExtensionPoint(config);
}
