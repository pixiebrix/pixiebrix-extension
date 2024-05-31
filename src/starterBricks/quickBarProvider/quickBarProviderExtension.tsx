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
import { checkAvailable, testMatchPatterns } from "@/bricks/available";
import reportError from "@/telemetry/reportError";
import { selectExtensionContext } from "@/starterBricks/helpers";
import { collectAllBricks } from "@/bricks/util";
import { mergeReaders } from "@/bricks/readers/readerUtils";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import { CancelError } from "@/errors/businessErrors";
import { guessSelectedElement } from "@/utils/selectionController";
import {
  type InitialValues,
  reduceExtensionPipeline,
} from "@/runtime/reducePipeline";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { isSpecificError } from "@/errors/errorHelpers";
import { type ActionGenerator } from "@/components/quickBar/quickbarTypes";
import ArrayCompositeReader from "@/bricks/readers/ArrayCompositeReader";
import {
  QuickbarQueryReader,
  quickbarQueryReaderShim,
} from "@/starterBricks/quickBarProvider/quickbarQueryReader";
import { type Reader } from "@/types/bricks/readerTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import { type Schema } from "@/types/schemaTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { type Brick } from "@/types/brickTypes";
import { isLoadedInIframe } from "@/utils/iframeUtils";
import makeIntegrationsContextFromDependencies from "@/integrations/util/makeIntegrationsContextFromDependencies";
import pluralize from "@/utils/pluralize";
import { allSettled } from "@/utils/promiseUtils";
import type { PlatformCapability } from "@/platform/capabilities";
import type { PlatformProtocol } from "@/platform/platformProtocol";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { selectEventData } from "@/telemetry/deployments";
import {
  type QuickBarProviderDefaultOptions,
  type QuickBarProviderConfig,
  type QuickBarProviderDefinition,
} from "@/starterBricks/quickBarProvider/types";
import { assertNotNullish } from "@/utils/nullishUtils";

export abstract class QuickBarProviderStarterBrickABC extends StarterBrickABC<QuickBarProviderConfig> {
  static isQuickBarProviderExtensionPoint(
    extensionPoint: StarterBrick,
  ): extensionPoint is QuickBarProviderStarterBrickABC {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any
    -- Need to access a type specific property (QuickBarProviderStarterBrickABC._definition) on a base-typed entity (StarterBrick) */
    return (extensionPoint as any)?._definition?.type === "quickBarProvider";
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
    extension: ResolvedModComponent<QuickBarProviderConfig>,
  ): Promise<Brick[]> {
    return collectAllBricks(extension.config.generator);
  }

  public get kind(): "quickBarProvider" {
    return "quickBarProvider";
  }

  override uninstall(): void {
    // Remove generators and all existing actions in the Quick Bar
    this.clearModComponentInterfaceAndEvents(
      this.modComponents.map((x) => x.id),
    );
    quickBarRegistry.removeExtensionPointActions(this.id);
    this.modComponents.length = 0;
  }

  /**
   * Unregister quick bar action providers for the given extension IDs.
   * @param extensionIds the extensions IDs to unregister
   */
  clearModComponentInterfaceAndEvents(extensionIds: UUID[]): void {
    for (const extensionId of extensionIds) {
      const generator = this.generators.get(extensionId);
      assertNotNullish(generator, `Generator not found for ${extensionId}`);

      quickBarRegistry.removeGenerator(generator);
      this.generators.delete(extensionId);
    }
  }

  async install(): Promise<boolean> {
    const { initQuickBarApp } = await import(
      /* webpackChunkName: "quickBarApp" */
      "@/components/quickBar/QuickBarApp"
    );

    await initQuickBarApp();

    // Like for context menus, the match patterns for quick bar control which pages the extension point requires early
    // access to (so PixieBrix will ask for permissions). Whether a quick bar item actually appears is controlled by the
    // documentUrlPatterns.
    return true;
  }

  async runModComponents(): Promise<void> {
    if (this.modComponents.length === 0) {
      console.debug(
        `quickBar starter brick ${this.id} has no installed components`,
      );

      // Not sure if this is needed or not, but remove any straggler extension actions
      quickBarRegistry.removeExtensionPointActions(this.id);
      return;
    }

    await this.syncActionProvidersForUrl();
  }

  override async defaultReader(): Promise<Reader> {
    return new ArrayCompositeReader([
      // Include QuickbarQueryReader for the outputSchema. The value gets filled in by the run method
      new QuickbarQueryReader(),
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
    if (!testMatchPatterns(this.documentUrlPatterns)) {
      // Remove actions and un-attach generators
      quickBarRegistry.removeExtensionPointActions(this.id);
      this.clearModComponentInterfaceAndEvents(
        this.modComponents.map((x) => x.id),
      );
      return;
    }

    const promises = this.modComponents.map(async (extension) => {
      try {
        await this.registerActionProvider(extension);
      } catch (error) {
        reportError(error, { context: selectEventData(extension) });
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
   * Add a QuickBar action for extension
   */
  private async registerActionProvider(
    extension: ResolvedModComponent<QuickBarProviderConfig>,
  ): Promise<void> {
    const { generator, rootAction } = extension.config;

    const extensionLogger = this.logger.childLogger(
      selectExtensionContext(extension),
    );

    let rootActionId: string | null = null;

    if (rootAction) {
      const { title, icon: iconConfig } = rootAction;
      const icon = iconConfig ? (
        <Icon icon={iconConfig.id} library={iconConfig.library} />
      ) : (
        <Icon />
      ); // Defaults to a box

      rootActionId = `provider-${extension.id}`;

      quickBarRegistry.addAction({
        id: rootActionId,
        extensionPointId: this.id,
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
      quickBarRegistry.removeExtensionActions(extension.id);

      if (
        rootActionId &&
        rootActionId !== currentRootActionId &&
        rootAction?.requireActiveRoot
      ) {
        // User is not drilled into the current action, so skip generation
        return;
      }

      const [reader, serviceContext] = await Promise.all([
        this.getBaseReader(),
        makeIntegrationsContextFromDependencies(
          extension.integrationDependencies,
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
        serviceContext,
        optionsArgs: extension.optionsArgs,
      };

      try {
        await reduceExtensionPipeline(generator, initialValues, {
          logger: extensionLogger,
          ...apiVersionOptions(extension.apiVersion),
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
    const prevGenerator = this.generators.get(extension.id);
    if (prevGenerator) {
      quickBarRegistry.removeGenerator(prevGenerator);
    }

    // Register new generator
    this.generators.set(extension.id, actionGenerator);
    quickBarRegistry.addGenerator(actionGenerator, rootActionId);
  }
}

class RemoteQuickBarProviderExtensionPoint extends QuickBarProviderStarterBrickABC {
  private readonly _definition: QuickBarProviderDefinition;

  public readonly permissions: Permissions.Permissions;

  public readonly documentUrlPatterns: Manifest.MatchPattern[];

  public readonly rawConfig: StarterBrickDefinitionLike<QuickBarProviderDefinition>;

  constructor(
    platform: PlatformProtocol,
    config: StarterBrickDefinitionLike<QuickBarProviderDefinition>,
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

  public override get defaultOptions(): QuickBarProviderDefaultOptions {
    return this._definition.defaultOptions ?? {};
  }
}

export function fromJS(
  platform: PlatformProtocol,
  config: StarterBrickDefinitionLike<QuickBarProviderDefinition>,
): StarterBrick {
  const { type } = config.definition;
  if (type !== "quickBarProvider") {
    throw new Error(`Expected type=quickBarProvider, got ${type}`);
  }

  return new RemoteQuickBarProviderExtensionPoint(platform, config);
}
