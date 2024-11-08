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

import React from "react";
import { type Manifest, type Permissions } from "webextension-polyfill";
import {
  StarterBrickABC,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { castArray, cloneDeep, isEmpty } from "lodash";
import { checkAvailable, testMatchPatterns } from "../../bricks/available";
import reportError from "../../telemetry/reportError";
import { collectAllBricks } from "../../bricks/util";
import { mergeReaders } from "../../bricks/readers/readerUtils";
import quickBarRegistry from "../../components/quickBar/quickBarRegistry";
import Icon from "../../icons/Icon";
import { CancelError } from "../../errors/businessErrors";
import { guessSelectedElement } from "../../utils/selectionController";
import {
  type InitialValues,
  reduceModComponentPipeline,
} from "../../runtime/reducePipeline";
import apiVersionOptions from "../../runtime/apiVersionOptions";
import { isSpecificError } from "../../errors/errorHelpers";
import { type ActionGenerator } from "../../components/quickBar/quickbarTypes";
import ArrayCompositeReader from "../../bricks/readers/ArrayCompositeReader";
import {
  QuickBarQueryReader,
  quickbarQueryReaderShim,
} from "./quickBarQueryReader";
import { type Reader } from "../../types/bricks/readerTypes";
import {
  type StarterBrick,
  type StarterBrickType,
  StarterBrickTypes,
} from "../../types/starterBrickTypes";
import { type UUID } from "../../types/stringTypes";
import { type Schema } from "../../types/schemaTypes";
import { type HydratedModComponent } from "../../types/modComponentTypes";
import { type Brick } from "../../types/brickTypes";
import { isLoadedInIframe } from "../../utils/iframeUtils";
import makeIntegrationContextFromDependencies from "../../integrations/util/makeIntegrationContextFromDependencies";
import pluralize from "../../utils/pluralize";
import { allSettled } from "../../utils/promiseUtils";
import type { PlatformCapability } from "../../platform/capabilities";
import type { PlatformProtocol } from "../../platform/platformProtocol";
import { propertiesToSchema } from "../../utils/schemaUtils";
import { selectEventData } from "../../telemetry/deployments";
import {
  type DynamicQuickBarDefaultOptions,
  type DynamicQuickBarConfig,
  type DynamicQuickBarDefinition,
} from "./dynamicQuickBarTypes";
import { assertNotNullish } from "../../utils/nullishUtils";
import {
  getModComponentRef,
  mapModComponentToMessageContext,
} from "../../utils/modUtils";

export abstract class DynamicQuickBarStarterBrickABC extends StarterBrickABC<DynamicQuickBarConfig> {
  static isDynamicQuickBarStarterBrick(
    starterBrick: StarterBrick,
  ): starterBrick is DynamicQuickBarStarterBrickABC {
    return (
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Need to access a type specific property (QuickBarProviderStarterBrickABC._definition) on a base-typed entity (StarterBrick) */
      (starterBrick as any)?._definition?.type ===
      StarterBrickTypes.DYNAMIC_QUICK_BAR
    );
  }

  abstract getBaseReader(): Promise<Reader>;

  abstract readonly documentUrlPatterns: Manifest.MatchPattern[];

  private readonly generators: Map<UUID, ActionGenerator> = new Map<
    UUID,
    ActionGenerator
  >();

  readonly capabilities: PlatformCapability[] = ["quickBar"];

  inputSchema: Schema = propertiesToSchema(
    {
      rootAction: {
        type: "object",
        properties: {
          title: { type: "string" },
          icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
          requireActiveRoot: { type: "boolean" },
        },
      },
      generator: {
        oneOf: [
          { $ref: "https://app.pixiebrix.com/schemas/effect#" },
          {
            type: "array",
            items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
          },
        ],
      },
    },
    ["generator"],
  );

  async getBricks(
    modComponent: HydratedModComponent<DynamicQuickBarConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(modComponent.config.generator);
  }

  public get kind(): StarterBrickType {
    return StarterBrickTypes.DYNAMIC_QUICK_BAR;
  }

  override uninstall(): void {
    // Remove generators and all existing actions in the Quick Bar
    this.clearModComponentInterfaceAndEvents(
      this.modComponents.map((x) => x.id),
    );
    quickBarRegistry.removeStarterBrickActions(this.id);
    this.modComponents.length = 0;
  }

  /**
   * Unregister quick bar action providers for the given mod component IDs.
   * @param modComponentIds the mod component IDs to unregister
   */
  clearModComponentInterfaceAndEvents(modComponentIds: UUID[]): void {
    for (const modComponentId of modComponentIds) {
      const generator = this.generators.get(modComponentId);
      assertNotNullish(generator, `Generator not found for ${modComponentId}`);

      quickBarRegistry.removeGenerator(generator);
      this.generators.delete(modComponentId);
    }
  }

  async install(): Promise<boolean> {
    const { initQuickBarApp } = await import(
      /* webpackChunkName: "quickBarApp" */
      "../../components/quickBar/QuickBarApp"
    );

    await initQuickBarApp();

    // Like for context menus, the match patterns for quick bar control which pages the starter brick requires early
    // access to (so PixieBrix will ask for permissions). Whether a quick bar item actually appears is controlled by the
    // documentUrlPatterns.
    return true;
  }

  async runModComponents(): Promise<void> {
    if (this.modComponents.length === 0) {
      console.debug(
        `quickBar starter brick ${this.id} has no installed components`,
      );

      // Not sure if this is needed or not, but remove any straggler mod component actions
      quickBarRegistry.removeStarterBrickActions(this.id);
      return;
    }

    await this.syncActionProvidersForUrl();
  }

  override async defaultReader(): Promise<Reader> {
    return new ArrayCompositeReader([
      // Include QuickbarQueryReader for the outputSchema. The value gets filled in by the run method
      new QuickBarQueryReader(),
      await this.getBaseReader(),
    ]);
  }

  override async previewReader(): Promise<Reader> {
    return new ArrayCompositeReader([
      quickbarQueryReaderShim as unknown as Reader,
      await this.getBaseReader(),
    ]);
  }

  private async syncActionProvidersForUrl(): Promise<void> {
    // Remove any actions that were available on the previous navigation, but are no longer available
    if (!testMatchPatterns(this.documentUrlPatterns, null)) {
      // Remove actions and un-attach generators
      quickBarRegistry.removeStarterBrickActions(this.id);
      this.clearModComponentInterfaceAndEvents(
        this.modComponents.map((x) => x.id),
      );
      return;
    }

    const promises = this.modComponents.map(async (modComponent) => {
      try {
        await this.registerActionProvider(modComponent);
      } catch (error) {
        reportError(error, { context: selectEventData(modComponent) });
        throw error;
      }
    });

    await allSettled(promises, {
      catch: (errors) => {
        this.platform.toasts.showNotification({
          type: "error",
          message: `An error occurred adding ${pluralize(
            errors.length,
            "quick bar item",
          )}`,
        });
      },
    });
  }

  /**
   * Add a QuickBar action for mod component
   */
  private async registerActionProvider(
    modComponent: HydratedModComponent<DynamicQuickBarConfig>,
  ): Promise<void> {
    const { generator, rootAction } = modComponent.config;

    const modComponentLogger = this.logger.childLogger(
      mapModComponentToMessageContext(modComponent),
    );

    let rootActionId: string | null = null;

    if (rootAction) {
      const { title, icon: iconConfig } = rootAction;
      const icon = iconConfig ? (
        <Icon icon={iconConfig.id} library={iconConfig.library} />
      ) : (
        <Icon />
      ); // Defaults to a box

      rootActionId = `provider-${modComponent.id}`;

      quickBarRegistry.addAction({
        id: rootActionId,
        modComponentRef: getModComponentRef(modComponent),
        name: title,
        icon,
      });
    }

    const actionGenerator: ActionGenerator = async ({
      query,
      rootActionId: currentRootActionId,
      abortSignal,
    }) => {
      // Remove the old results during re-generation because they're no longer relevant
      quickBarRegistry.removeModComponentLeafActions(modComponent.id);

      if (
        rootActionId &&
        rootActionId !== currentRootActionId &&
        rootAction?.requireActiveRoot
      ) {
        // User is not drilled into the current action, so skip generation
        return;
      }

      const [reader, integrationContext] = await Promise.all([
        this.getBaseReader(),
        makeIntegrationContextFromDependencies(
          modComponent.integrationDependencies,
        ),
      ]);

      const targetElement = guessSelectedElement() ?? document;

      const input = {
        // Make sure to match the order in defaultReader so override behavior in the schema is accurate
        query,
        ...(await reader.read(targetElement)),
      };

      const initialValues: InitialValues = {
        input,
        root: targetElement,
        integrationContext,
        optionsArgs: modComponent.optionsArgs,
      };

      try {
        await reduceModComponentPipeline(generator, initialValues, {
          logger: modComponentLogger,
          modComponentRef: getModComponentRef(modComponent),
          ...apiVersionOptions(modComponent.apiVersion),
          abortSignal,
        });
      } catch (error) {
        if (isSpecificError(error, CancelError)) {
          // Ignore cancel errors. Creators can use to skip under certain conditions
        }

        throw error;
      }
    };

    // Remove previous generator (if any)
    const prevGenerator = this.generators.get(modComponent.id);
    if (prevGenerator) {
      quickBarRegistry.removeGenerator(prevGenerator);
    }

    // Register new generator
    this.generators.set(modComponent.id, actionGenerator);
    quickBarRegistry.addGenerator(actionGenerator, rootActionId);
  }
}

class RemoteDynamicQuickBarStarterBrick extends DynamicQuickBarStarterBrickABC {
  private readonly _definition: DynamicQuickBarDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly rawConfig: StarterBrickDefinitionLike<DynamicQuickBarDefinition>;

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<DynamicQuickBarDefinition>,
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
    const { isAvailable, documentUrlPatterns } = cloned.definition;
    // If documentUrlPatterns not specified show everywhere
    this.documentUrlPatterns = castArray(documentUrlPatterns ?? ["*://*/*"]);
    this.permissions = {
      origins: isAvailable?.matchPatterns
        ? castArray(isAvailable.matchPatterns)
        : [],
    };
  }

  async isAvailable(): Promise<boolean> {
    // The quick bar lives on the top-level frame. So any actions contributed will never be visible
    if (isLoadedInIframe()) {
      return false;
    }

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

  public override get defaultOptions(): DynamicQuickBarDefaultOptions {
    return this._definition.defaultOptions ?? {};
  }
}

export function fromJS(
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<DynamicQuickBarDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== StarterBrickTypes.DYNAMIC_QUICK_BAR) {
    throw new Error(`Expected type=quickBarProvider, got ${type}`);
  }

  return new RemoteDynamicQuickBarStarterBrick(platform, config);
}
