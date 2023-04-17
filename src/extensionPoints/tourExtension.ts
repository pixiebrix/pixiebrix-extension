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

import { propertiesToSchema } from "@/validators/generic";
import {
  ExtensionPoint,
  type ExtensionPointConfig,
  type ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { type Permissions } from "webextension-polyfill";
import {
  castArray,
  cloneDeep,
  groupBy,
  mapValues,
  max,
  minBy,
  partition,
} from "lodash";
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
import { getAll } from "@/tours/tourRunDatabase";
import { initPopoverPool } from "@/blocks/transformers/temporaryInfo/popoverUtils";
import { type UUID } from "@/types/stringTypes";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { type IBlock } from "@/types/blockTypes";
import { type Schema } from "@/types/schemaTypes";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type IExtensionPoint } from "@/types/extensionPointTypes";

export type TourConfig = {
  /**
   * The tour pipeline to run
   * @since 1.7.19
   */
  tour: BlockPipeline | BlockConfig;
};

export abstract class TourExtensionPoint extends ExtensionPoint<TourConfig> {
  public get kind(): "tour" {
    return "tour";
  }

  readonly extensionTours = new Map<UUID, RegisteredTour>();

  /**
   * Allow the user to manually run the tour, e.g., via the Quick Bar.
   */
  abstract get allowUserRun(): boolean;

  /**
   * Schedule for automatically running the tour.
   */
  abstract get autoRunSchedule(): TourDefinition["autoRunSchedule"];

  async install(): Promise<boolean> {
    if (await this.isAvailable()) {
      await initPopoverPool();
      return true;
    }
  }

  clearExtensionInterfaceAndEvents(extensionIds: UUID[]): void {
    console.debug("tourExtension:removeExtensions");
    unregisterTours(this.extensions.map((x) => x.id));
  }

  override uninstall(): void {
    console.debug("tourExtension:uninstall", {
      id: this.id,
    });
    unregisterTours(this.extensions.map((x) => x.id));
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
      allowUserRun: this.allowUserRun,
      run: () => {
        const abortController = new AbortController();
        const promise = this.runExtensionTour(extension, abortController);
        return { promise, abortController };
      },
    });

    this.extensionTours.set(extension.id, tour);
  }

  /**
   * Decide which tour to run based on the autoRunSchedule and the tour history.
   *
   * Prefer:
   * - If "once", only consider tours that haven't finished before.
   * - If "always", consider all tours
   * - Choose the tour that hasn't been run in the longest time
   *
   * @see autoRunSchedule
   */
  async decideAutoRunTour(): Promise<ResolvedExtension<TourConfig>> {
    const extensionIds = new Set(this.extensions.map((x) => x.id));

    const runs = await getAll();

    // Try to group by extensionId, otherwise fall back to blueprintId+label
    const matching = groupBy(runs, (tour) => {
      if (extensionIds.has(tour.extensionId)) {
        return tour.extensionId;
      }

      for (const extension of this.extensions) {
        if (
          extension._recipe?.id === tour.packageId &&
          extension.label === tour.tourName
        ) {
          return extension.id;
        }
      }

      return null;
    });

    const latest = mapValues(matching, (xs) =>
      max(xs.map((x) => Date.parse(x.updatedAt)))
    );

    const [someRun, neverRun] = partition(this.extensions, (x) => latest[x.id]);

    if (neverRun.length > 0) {
      return neverRun[0];
    }

    if (this.autoRunSchedule === "once") {
      return null;
    }

    return minBy(someRun, (x) => latest[x.id]);
  }

  async run({ reason, extensionIds }: RunArgs): Promise<void> {
    if (this.extensions.length === 0) {
      // NOP
      return;
    }

    // Always ensure all tours are registered
    for (const extension of this.extensions) {
      this.registerTour(extension);
    }

    // User requested the tour run from the Page Editor. Ignore RunReason.MANUAL here, since we don't want
    // tours re-running on Page Editor close/open or "Reactivate All" unless they have a matching autoRunSchedule
    if (reason === RunReason.PAGE_EDITOR) {
      cancelAllTours();
      const extensionPool = extensionIds ?? this.extensions.map((x) => x.id);
      this.extensionTours.get(extensionPool[0])?.run();
      return;
    }

    if (isTourInProgress()) {
      console.debug("Tour already in progress, skipping %s", this.id);
      return;
    }

    if (this.autoRunSchedule === "never") {
      // Don't auto-run tours from this extension point. They must be run via the tourController run method
      return;
    }

    // Have to re-check isTourInProgress to avoid race condition with other instances of this extension point
    // returning from decideAutoRunTour
    const extension = await this.decideAutoRunTour();
    if (extension && !isTourInProgress()) {
      this.extensionTours.get(extension.id).run();
    }
  }
}

type TourDefinitionOptions = Record<string, unknown>;

export interface TourDefinition extends ExtensionPointDefinition {
  defaultOptions?: TourDefinitionOptions;

  /**
   * Automatically run the tour on matching pages.
   * @since 1.7.19
   */
  autoRunSchedule?: "never" | "once" | "always";

  /**
   * Allow the user to manually run the tour. Causes the tour to be available in the Quick Bar.
   * @since 1.7.19
   */
  allowUserRun?: boolean;
}

class RemoteTourExtensionPoint extends TourExtensionPoint {
  private readonly _definition: TourDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: ExtensionPointConfig<TourDefinition>;

  public override get defaultOptions(): Record<string, unknown> {
    return this._definition.defaultOptions ?? { allowUserRun: true };
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

  override get allowUserRun(): boolean {
    return this._definition.allowUserRun ?? true;
  }

  override get autoRunSchedule(): TourDefinition["autoRunSchedule"] {
    return this._definition.autoRunSchedule ?? "never";
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
