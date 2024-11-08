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

import { type ReaderConfig } from "@/bricks/types";
import { type Permissions } from "webextension-polyfill";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type RunArgs } from "@/types/runtimeTypes";
import {
  type RegistryId,
  type Metadata,
  type Definition,
  DefinitionKinds,
} from "@/types/registryTypes";
import {
  type StarterBrickType,
  type StarterBrick,
} from "@/types/starterBrickTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Logger } from "@/types/loggerTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Brick } from "@/types/brickTypes";
import { type UUID } from "@/types/stringTypes";
import { type PlatformCapability } from "../platform/capabilities";
import { type PlatformProtocol } from "../platform/platformProtocol";
import { type Availability } from "@/types/availabilityTypes";

/**
 * Follows the semantics of lodash's debounce: https://lodash.com/docs/4.17.15#debounce
 */
export type DebounceOptions = {
  /**
   * The number of milliseconds to delay.
   */
  waitMillis?: number;

  /**
   * Specify invoking on the leading edge of the timeout.
   */
  leading?: boolean;

  /**
   *  Specify invoking on the trailing edge of the timeout.
   */
  trailing?: boolean;
};

/**
 * Custom options for the `custom` trigger
 * @since 1.6.5
 */
export type CustomEventOptions = {
  /**
   * The name of the event.
   */
  eventName: string;
};

/**
 * `definition` property of a starter brick definition.
 * @see StarterBrickDefinitionLike
 */
export type StarterBrickDefinitionProp = {
  type: StarterBrickType;
  isAvailable: Availability;
  reader: ReaderConfig;
};

/**
 * A registry package or inner definition of a starter brick.
 *
 * Does not extend `Definition` because apiVersion and metadata fields are not provided for inner definitions.
 *
 * @see Definition
 */
export interface StarterBrickDefinitionLike<
  T extends StarterBrickDefinitionProp = StarterBrickDefinitionProp,
> {
  apiVersion?: Definition["apiVersion"];
  metadata?: Definition["metadata"];
  definition: T;
  kind: typeof DefinitionKinds.STARTER_BRICK;
}

export function isStarterBrickDefinitionProp(
  value: unknown,
): value is StarterBrickDefinitionProp {
  if (value == null || typeof value !== "object") {
    return false;
  }

  const definition = value as StarterBrickDefinitionProp;

  return (
    definition.type !== undefined &&
    definition.reader !== undefined &&
    typeof definition.isAvailable === "object"
  );
}

/**
 * @see assertStarterBrickDefinitionLike
 */
export function isStarterBrickDefinitionLike(
  value: unknown,
): value is StarterBrickDefinitionLike {
  try {
    assertStarterBrickDefinitionLike(value);
    return true;
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }

    throw error;
  }
}

/**
 * @see isStarterBrickDefinitionLike
 */
export function assertStarterBrickDefinitionLike(
  value: unknown,
): asserts value is StarterBrickDefinitionLike {
  const errorContext = { value };

  if (typeof value !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError("Expected object for StarterBrickDefinitionLike");
  }

  const config = value as UnknownObject;

  if (config.kind !== DefinitionKinds.STARTER_BRICK) {
    console.warn("Expected extension point", errorContext);
    throw new TypeError(
      "Expected kind 'extensionPoint' for StarterBrickDefinitionLike",
    );
  }

  if (typeof config.definition !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError(
      "Expected object for definition in StarterBrickDefinitionLike",
    );
  }

  if (!isStarterBrickDefinitionProp(config.definition)) {
    throw new TypeError(
      "Invalid definition prop in StarterBrickDefinitionLike",
    );
  }
}

/**
 * Abstract base class for StarterBrick implementations.
 */
export abstract class StarterBrickABC<TConfig extends UnknownObject>
  implements StarterBrick
{
  public readonly id: RegistryId;

  /**
   * A unique nonce for this instance of the extension point to aid with debugging.
   */
  public readonly instanceNonce: UUID;

  public readonly name: string;

  public readonly description?: string;

  /**
   * The current registered mod components.
   */
  protected readonly modComponents: Array<HydratedModComponent<TConfig>> = [];

  public abstract readonly inputSchema: Schema;

  public abstract readonly capabilities: PlatformCapability[];

  protected readonly logger: Logger;

  public abstract get kind(): StarterBrickType;

  public get isSyncInstall() {
    return false;
  }

  public get registeredModComponents(): Array<HydratedModComponent<TConfig>> {
    return [...this.modComponents];
  }

  /**
   * Permissions required to use the mod components attached to the starter brick.
   * https://developer.chrome.com/extensions/permission_warnings
   */
  public abstract readonly permissions: Permissions.Permissions;

  public get defaultOptions(): UnknownObject {
    return {};
  }

  // Support injecting the platform via constructor to allow platforms to allow:
  // 1) more fine-grained control during testing, and
  // 2) contexts like the PageEditor to inspect the starter brick as if it were running on another platform
  protected constructor(
    public readonly platform: PlatformProtocol,
    metadata: Metadata,
  ) {
    this.id = validateRegistryId(metadata.id);
    this.name = metadata.name;
    this.description = metadata.description;
    this.instanceNonce = uuidv4();
    this.logger = this.platform.logger.childLogger({
      starterBrickId: this.id,
    });
  }

  /**
   * Internal helper method to clear an extension's UI and triggers/observers/etc. from the page.
   *
   * NOTE: when this method is called, the extensions will still be in this.modComponents. The caller is responsible for
   * updating this.modComponents as necessary.
   *
   * @see synchronizeModComponents
   * @see removeModComponent
   */
  protected abstract clearModComponentInterfaceAndEvents(
    componentIds: UUID[],
  ): void;

  synchronizeModComponents(
    modComponents: Array<HydratedModComponent<TConfig>>,
  ): void {
    const before = this.modComponents.map((x) => x.id);

    const updatedIds = new Set(modComponents.map((x) => x.id));
    const removed = this.modComponents.filter(
      (currentComponent) => !updatedIds.has(currentComponent.id),
    );
    this.clearModComponentInterfaceAndEvents(removed.map((x) => x.id));

    // Clear this.modComponents and re-populate with updated components
    this.modComponents.length = 0;
    this.modComponents.push(...modComponents);

    // `registerModVariables` is safe to call multiple times for the same modId because the variable definitions
    // will be consistent across components.
    for (const modComponent of modComponents) {
      this.platform.state.registerModVariables(
        modComponent.modMetadata.id,
        modComponent.variablesDefinition,
      );
    }

    console.debug("synchronizeComponents for extension point %s", this.id, {
      before,
      after: modComponents.map((x) => x.id),
      removed: removed.map((x) => x.id),
    });
  }

  removeModComponent(componentId: UUID): void {
    this.synchronizeModComponents(
      this.modComponents.filter((x) => x.id !== componentId),
    );
  }

  registerModComponent(modComponent: HydratedModComponent<TConfig>): void {
    const index = this.modComponents.findIndex((x) => x.id === modComponent.id);
    if (index >= 0) {
      console.warn(
        `Component ${modComponent.id} already registered for the starter brick ${this.id}`,
      );
      /* eslint-disable-next-line security/detect-object-injection --
      -- Index is guaranteed to be a number, and this.modComponents is an array */
      this.modComponents[index] = modComponent;
    } else {
      this.modComponents.push(modComponent);
    }

    this.platform.state.registerModVariables(
      modComponent.modMetadata.id,
      modComponent.variablesDefinition,
    );
  }

  abstract defaultReader(): Promise<Reader>;

  async previewReader(): Promise<Reader> {
    return this.defaultReader();
  }

  abstract getBricks(
    modComponent: HydratedModComponent<TConfig>,
  ): Promise<Brick[]>;

  abstract isAvailable(): Promise<boolean>;

  abstract install(): Promise<boolean>;

  abstract runModComponents(args: RunArgs): Promise<void>;

  uninstall(_options?: { global?: boolean }): void {
    console.warn(`Uninstall not implemented for extension point: ${this.id}`);
  }
}
