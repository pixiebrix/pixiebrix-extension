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

import { type Availability, type ReaderConfig } from "@/bricks/types";
import { type Permissions } from "webextension-polyfill";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type ApiVersion, type RunArgs } from "@/types/runtimeTypes";
import { type RegistryId, type Metadata } from "@/types/registryTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { type BrickIcon } from "@/types/iconTypes";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Logger } from "@/types/loggerTypes";
import { type Reader } from "@/types/bricks/readerTypes";
import { type Brick } from "@/types/brickTypes";
import { type UUID } from "@/types/stringTypes";
import { type UnknownObject } from "@/types/objectTypes";

export type StarterBrickType =
  | "panel"
  | "menuItem"
  | "trigger"
  | "contextMenu"
  | "actionPanel"
  | "quickBar"
  | "quickBarProvider"
  | "tour";

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

export interface StarterBrickDefinition {
  type: StarterBrickType;
  isAvailable: Availability;
  reader: ReaderConfig;
}

export interface StarterBrickConfig<
  T extends StarterBrickDefinition = StarterBrickDefinition
> {
  apiVersion?: ApiVersion;
  metadata: Metadata;
  definition: T;
  kind: "extensionPoint";
}

export function assertStarterBrickConfig(
  maybeStarterBrickConfig: unknown
): asserts maybeStarterBrickConfig is StarterBrickConfig {
  const errorContext = { value: maybeStarterBrickConfig };

  if (typeof maybeStarterBrickConfig !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError("Expected object for StarterBrickConfig");
  }

  const config = maybeStarterBrickConfig as Record<string, unknown>;

  if (config.kind !== "extensionPoint") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError(
      "Expected kind 'extensionPoint' for StarterBrickConfig"
    );
  }

  if (typeof config.definition !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError("Expected object for definition in StarterBrickConfig");
  }

  const definition = config.definition as StarterBrickDefinition;

  if (typeof definition.isAvailable !== "object") {
    console.warn("Expected object for definition.isAvailable", errorContext);
    throw new TypeError("Invalid definition in StarterBrickConfig");
  }
}

export abstract class StarterBrickABC<TConfig extends UnknownObject>
  implements StarterBrick
{
  public readonly id: RegistryId;

  /**
   * A unique nonce for this instance of the extension point to aid with debugging.
   */
  public readonly instanceNonce: UUID;

  public readonly name: string;

  public readonly icon: BrickIcon;

  public readonly description: string;

  protected readonly components: Array<ResolvedModComponent<TConfig>> = [];

  protected readonly template?: string;

  public abstract readonly inputSchema: Schema;

  protected readonly logger: Logger;

  public abstract get kind(): StarterBrickType;

  public get isSyncInstall() {
    return false;
  }

  public get registeredComponents(): Array<ResolvedModComponent<TConfig>> {
    return [...this.components];
  }

  /**
   * Permissions required to use the extensions attached to the extension point.
   * https://developer.chrome.com/extensions/permission_warnings
   */
  public abstract readonly permissions: Permissions.Permissions;

  public get defaultOptions(): UnknownObject {
    return {};
  }

  protected constructor(metadata: Metadata, logger: Logger) {
    this.id = validateRegistryId(metadata.id);
    this.name = metadata.name;
    this.icon = metadata.icon;
    this.description = metadata.description;
    this.instanceNonce = uuidv4();
    this.logger = logger.childLogger({ extensionPointId: this.id });
  }

  /**
   * Internal helper method to clear an extension's UI and triggers/observers/etc. from the page.
   *
   * NOTE: when this method is called, the extensions will still be in this.extensions. The caller is responsible for
   * updating this.extensions as necessary.
   *
   * @see synchronizeComponents
   * @see removeComponent
   */
  protected abstract clearComponentInterfaceAndEvents(
    componentIds: UUID[]
  ): void;

  synchronizeComponents(
    components: Array<ResolvedModComponent<TConfig>>
  ): void {
    const before = this.components.map((x) => x.id);

    const updatedIds = new Set(components.map((x) => x.id));
    const removed = this.components.filter(
      (currentComponent) => !updatedIds.has(currentComponent.id)
    );
    this.clearComponentInterfaceAndEvents(removed.map((x) => x.id));

    // Clear extensions and re-populate with updated components
    this.components.splice(0, this.components.length);
    this.components.push(...components);

    console.debug("synchronizeComponents for extension point %s", this.id, {
      before,
      after: components.map((x) => x.id),
      removed: removed.map((x) => x.id),
    });
  }

  removeComponent(componentId: UUID): void {
    this.synchronizeComponents(
      this.components.filter((x) => x.id !== componentId)
    );
  }

  registerComponent(componentId: ResolvedModComponent<TConfig>): void {
    const index = this.components.findIndex((x) => x.id === componentId.id);
    if (index >= 0) {
      console.warn(
        `Extension ${componentId.id} already registered for the extension point ${this.id}`
      );
      // Index is guaranteed to be a number, and this.extensions is an array
      // eslint-disable-next-line security/detect-object-injection
      this.components[index] = componentId;
    } else {
      this.components.push(componentId);
    }
  }

  abstract defaultReader(): Promise<Reader>;

  async previewReader(): Promise<Reader> {
    return this.defaultReader();
  }

  abstract getBricks(
    extension: ResolvedModComponent<TConfig>
  ): Promise<Brick[]>;

  abstract isAvailable(): Promise<boolean>;

  abstract install(): Promise<boolean>;

  uninstall(_options?: { global?: boolean }): void {
    console.warn(`Uninstall not implemented for extension point: ${this.id}`);
  }

  abstract run(args: RunArgs): Promise<void>;
}
