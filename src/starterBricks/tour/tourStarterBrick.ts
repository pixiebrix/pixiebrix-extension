/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
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
import { checkAvailable } from "@/bricks/available";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import "@/vendors/hoverintent";
import { selectModComponentContext } from "@/starterBricks/helpers";
import {
  type InitialValues,
  reduceModComponentPipeline,
} from "@/runtime/reducePipeline";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import {
  cancelAllTours,
  isTourInProgress,
  type RegisteredTour,
  registerTour,
  unregisterTours,
} from "@/starterBricks/tour/tourController";
import { getAll } from "@/tours/tourRunDatabase";
import { type UUID } from "@/types/stringTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { type Schema } from "@/types/schemaTypes";
import { type RunArgs, RunReason } from "@/types/runtimeTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  type TourConfig,
  type TourDefinition,
} from "@/starterBricks/tour/tourTypes";
import { type Nullishable, assertNotNullish } from "@/utils/nullishUtils";

export abstract class TourStarterBrickABC extends StarterBrickABC<TourConfig> {
  public get kind(): "tour" {
    return "tour";
  }

  readonly capabilities: PlatformCapability[] = CONTENT_SCRIPT_CAPABILITIES;

  readonly modComponentTours = new Map<UUID, RegisteredTour>();

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
      const { initPopoverPool } = await import(
        /* webpackChunkName: "popoverUtils" */
        "@/contentScript/popoverDom"
      );

      await initPopoverPool();
      return true;
    }

    return false;
  }

  clearModComponentInterfaceAndEvents(modComponentIds: UUID[]): void {
    console.debug("tourStarterBrick:clearModComponentInterfaceAndEvents");
    unregisterTours(this.modComponents.map((x) => x.id));
  }

  override uninstall(): void {
    console.debug("tourStarterBrick:uninstall", {
      id: this.id,
    });
    unregisterTours(this.modComponents.map((x) => x.id));
  }

  inputSchema: Schema = propertiesToSchema(
    {
      tour: {
        $ref: "https://app.pixiebrix.com/schemas/effect#",
      },
    },
    ["tour"],
  );

  async getBricks(
    modComponent: HydratedModComponent<TourConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.tour);
  }

  private async runModComponentTour(
    modComponent: HydratedModComponent<TourConfig>,
    abortController: AbortController,
  ): Promise<void> {
    const reader = await this.defaultReader();
    const { tour: tourConfig } = modComponent.config;
    const ctxt = await reader.read(document);

    const modComponentLogger = this.logger.childLogger(
      selectModComponentContext(modComponent),
    );

    const initialValues: InitialValues = {
      input: ctxt,
      root: document,
      serviceContext: await makeIntegrationsContextFromDependencies(
        modComponent.integrationDependencies,
      ),
      optionsArgs: modComponent.optionsArgs,
    };

    await reduceModComponentPipeline(tourConfig, initialValues, {
      logger: modComponentLogger,
      ...apiVersionOptions(modComponent.apiVersion),
      abortSignal: abortController.signal,
    });
  }

  /**
   * Register a tour with the tour controller.
   */
  private async registerTour(
    modComponent: HydratedModComponent<TourConfig>,
  ): Promise<void> {
    assertNotNullish(
      modComponent._recipe?.id,
      "Blueprint ID is required to register tour",
    );

    const tour = await registerTour({
      blueprintId: modComponent._recipe.id,
      extension: modComponent,
      allowUserRun: this.allowUserRun,
      run: () => {
        const abortController = new AbortController();
        const promise = this.runModComponentTour(modComponent, abortController);
        return { promise, abortController };
      },
    });

    this.modComponentTours.set(modComponent.id, tour);
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
  async decideAutoRunTour(): Promise<
    Nullishable<HydratedModComponent<TourConfig>>
  > {
    const modComponentIds = new Set(this.modComponents.map((x) => x.id));

    const runs = await getAll();

    // Try to group by mod component id, otherwise fall back to mod id + label
    const matching = groupBy(runs, (tour) => {
      if (modComponentIds.has(tour.extensionId)) {
        return tour.extensionId;
      }

      for (const modComponent of this.modComponents) {
        if (
          modComponent._recipe?.id === tour.packageId &&
          modComponent.label === tour.tourName
        ) {
          return modComponent.id;
        }
      }

      return null;
    });

    const latest = mapValues(matching, (xs) =>
      max(xs.map((x) => Date.parse(x.updatedAt))),
    );

    const [someRun, neverRun] = partition(
      this.modComponents,
      (x) => latest[x.id],
    );

    if (neverRun.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check
      return neverRun[0]!;
    }

    if (this.autoRunSchedule === "once") {
      return null;
    }

    return minBy(someRun, (x) => latest[x.id]);
  }

  async runModComponents({ reason, extensionIds }: RunArgs): Promise<void> {
    if (this.modComponents.length === 0) {
      // NOP
      return;
    }

    // Always ensure all tours are registered
    await Promise.all(
      this.modComponents.map(async (modComponent) => {
        await this.registerTour(modComponent);
      }),
    );

    // User requested the tour run from the Page Editor. Ignore RunReason.MANUAL here, since we don't want
    // tours re-running on Page Editor close/open or "Reactivate All" unless they have a matching autoRunSchedule
    if (reason === RunReason.PAGE_EDITOR) {
      cancelAllTours();
      const modComponentPool =
        extensionIds ?? this.modComponents.map((x) => x.id);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- this.modComponents.length > 0
      this.modComponentTours.get(modComponentPool[0]!)?.run();
      return;
    }

    if (isTourInProgress()) {
      console.debug("Tour already in progress, skipping %s", this.id);
      return;
    }

    if (this.autoRunSchedule === "never") {
      // Don't auto-run tours from this starter brick. They must be run via the tourController run method
      return;
    }

    // Have to re-check isTourInProgress to avoid race condition with other instances of this starter brick
    // returning from decideAutoRunTour
    const modComponent = await this.decideAutoRunTour();
    if (modComponent && !isTourInProgress()) {
      const registeredTour = this.modComponentTours.get(modComponent.id);
      assertNotNullish(registeredTour, "Tour not registered");
      registeredTour.run();
    }
  }
}

class RemoteTourStarterBrick extends TourStarterBrickABC {
  private readonly _definition: TourDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly rawConfig: StarterBrickDefinitionLike<TourDefinition>;

  public override get defaultOptions(): UnknownObject {
    return this._definition.defaultOptions ?? { allowUserRun: true };
  }

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<TourDefinition>,
  ) {
    // `cloneDeep` to ensure we have an isolated copy (since proxies could get revoked)
    const cloned = cloneDeep(config);
    assertNotNullish(
      cloned.metadata,
      "metadata is required to create a starter brick",
    );
    super(platform, cloned.metadata);
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
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<TourDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== "tour") {
    throw new Error(`Expected type=tour, got ${type}`);
  }

  return new RemoteTourStarterBrick(platform, config);
}
