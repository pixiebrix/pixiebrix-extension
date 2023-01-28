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
  type Schema,
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

export type TourConfig = {
  tour: BlockPipeline | BlockConfig;
};

export abstract class TourExtensionPoint extends ExtensionPoint<TourConfig> {
  public get kind(): "tour" {
    return "tour";
  }

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
  }

  inputSchema: Schema = propertiesToSchema({
    tour: {
      $ref: "https://app.pixiebrix.com/schemas/effect#",
    },
  });

  async getBlocks(extension: ResolvedExtension<TourConfig>): Promise<IBlock[]> {
    return blockList(extension.config.tour);
  }

  async run(): Promise<void> {
    // NOP
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
