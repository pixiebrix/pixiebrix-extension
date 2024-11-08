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

import { registry as backgroundRegistry } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { expectContext } from "@/utils/expectContext";
import {
  type DefinitionKind,
  DoesNotExistError,
  type EnumerableRegistry,
  type RegistryId,
  type RegistryItem,
} from "@/types/registryTypes";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";

type Source =
  // From the remote brick registry
  | "remote"
  // From a JS-defined brick
  | "builtin"
  // From an internal definition
  | "internal";

/**
 * `backgroundRegistry` database change listeners.
 */
const packageRegistryChange = new SimpleEventTarget();

/**
 * Replace IDB with remote packages and notify listeners.
 */
export const syncRemotePackages = memoizeUntilSettled(async () => {
  expectContext("extension");

  await backgroundRegistry.syncRemote();
  packageRegistryChange.emit();
});

/**
 * Clear packages in the local database, and notify listeners.
 */
export const clearPackages = async () => {
  expectContext("extension");

  await backgroundRegistry.clear();
  packageRegistryChange.emit();
};

/**
 * Brick registry, with remote bricks backed by IDB.
 */
class MemoryRegistry<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>,
> implements EnumerableRegistry<Id, Item>
{
  /**
   * Registered built-in items. Used to keep track of built-ins across cache clears.
   */
  private readonly _builtins = new Map<RegistryId, Item>();

  /**
   * Registered internal definitions. Used to keep track across cache clears. They don't need to be cleared because
   * they are stored by content hash.
   */
  private readonly _internal = new Map<RegistryId, Item>();

  /**
   * Cache of items in the registry. Contains both built-ins and remote items.
   */
  private readonly _cache = new Map<RegistryId, Item>();

  /**
   * Track the state of the cache
   */
  private _cacheInitialized = false;

  public readonly kinds: Set<DefinitionKind>;

  private deserialize: ((raw: unknown) => Item) | null;

  onChange = new SimpleEventTarget();

  constructor(
    kinds: DefinitionKind[],
    deserialize: ((raw: unknown) => Item) | null,
  ) {
    this.kinds = new Set(kinds);
    this.deserialize = deserialize;

    packageRegistryChange.add(() => {
      // If database changes, clear the cache to force reloading user-defined bricks
      this.clear();
    });
  }

  /**
   * Set the deserialize method for the registry. Where possible, pass via the constructor.
   * @param deserialize the deserialize method
   */
  setDeserialize(deserialize: (raw: unknown) => Item): void {
    if (this.deserialize) {
      throw new Error("Cannot set deserializer more than once");
    }

    this.deserialize = deserialize;
  }

  /**
   * Return true if the registry contains the given item
   */
  async exists(registryId: Id): Promise<boolean> {
    return (
      this._cache.has(registryId) ||
      (await backgroundRegistry.find(registryId)) != null
    );
  }

  /**
   * Return the item with the given id, or throw an error if it does not exist
   * @throws DoesNotExistError if the item does not exist
   * @see exists
   */
  async lookup(registryId?: Id): Promise<Item> {
    if (!registryId) {
      throw new Error("id is required");
    }

    const cached = this._cache.get(registryId);

    if (cached) {
      return cached;
    }

    const localItem =
      this._builtins.get(registryId) ?? this._internal.get(registryId);

    if (localItem) {
      return localItem;
    }

    if (isInnerDefinitionRegistryId(registryId)) {
      // Avoid the IDB lookup for internal definitions, because we know they are not there
      throw new DoesNotExistError(registryId);
    }

    // Look up in IDB
    const raw = await backgroundRegistry.find(registryId);

    if (!raw) {
      console.debug(`Cannot find ${registryId as string} in registry`);
      throw new DoesNotExistError(registryId);
    }

    const item = this.parse(raw.config);

    if (!item) {
      console.debug("Unable to parse block", {
        config: raw.config,
      });
      throw new Error("Unable to parse block");
    }

    this.register([item], { source: "remote" });

    return item;
  }

  /**
   * Return true if the cache is fully initialized
   * @see cached
   */
  get isCachedInitialized(): boolean {
    return this._cacheInitialized;
  }

  /**
   * Return built-in JS bricks registered. Used for header generation.
   */
  get builtins(): Item[] {
    return [...this._builtins.values()];
  }

  /**
   * Synchronously return all cached bricks
   * @deprecated requires all data to be parsed
   * @throws Error if the cache is not initialized
   * @see isCachedInitialized
   * @see all
   */
  get cached(): Item[] {
    if (!this._cacheInitialized) {
      throw new Error("Cache not initialized");
    }

    return [...this._cache.values()];
  }

  /**
   * Reloads all brick configurations from IDB, and returns all bricks in the registry.
   * @deprecated requires all data to be parsed
   * @see cached
   */
  async all(): Promise<Item[]> {
    const packages = await backgroundRegistry.getByKinds([
      ...this.kinds.values(),
    ]);

    const remoteItems: Item[] = [];
    for (const packageVersion of packages) {
      const item = this.parse(packageVersion.config);
      if (item) {
        remoteItems.push(item);
      }
    }

    console.debug(
      "Parsed %d registry item(s) from IDB for %s",
      remoteItems.length,
      [...this.kinds].join(", "),
    );

    // Perform as single call to register so listeners are notified once
    this.register(remoteItems, { source: "remote", notify: false });
    this.register([...this._builtins.values()], {
      source: "builtin",
      notify: false,
    });
    this.register([...this._internal.values()], {
      source: "internal",
      notify: false,
    });
    this.onChange.emit();

    this._cacheInitialized = true;

    return this.cached;
  }

  /**
   * Add one or more items to the in-memory registry. Does not store the items in IDB.
   * @param items the items to register
   * @param source the source of the items
   * @param notify whether to notify listeners
   */
  register(
    items: Item[],
    {
      source = "builtin",
      notify = true,
    }: { source?: Source; notify?: boolean } = {},
  ): void {
    let changed = false;

    for (const item of items) {
      if (item.id == null) {
        console.warn("Skipping item with no id", item);
        continue;
      }

      if (source === "builtin") {
        this._builtins.set(item.id, item);
      } else if (source === "internal") {
        this._internal.set(item.id, item);
      }

      this._cache.set(item.id, item);
      changed = true;
    }

    if (changed && notify) {
      this.onChange.emit();
    }
  }

  private parse(raw: unknown): Item | undefined {
    if (!this.deserialize) {
      throw new Error("Internal error: deserializer not set");
    }

    try {
      return this.deserialize(raw);
    } catch (error) {
      console.warn(
        "Error de-serializing item: %s",
        getErrorMessage(error),
        raw,
      );
      return undefined;
    }
  }

  /**
   * Clear the registry cache completely and notify listeners.
   */
  clear(): void {
    // Need to clear the whole thing, including built-ins. Listeners will often can all() to repopulate the cache.
    this._cacheInitialized = false;
    this._cache.clear();
    this.onChange.emit();
  }

  /**
   * Test-only method to completely reset the registry state. Does NOT notify listeners
   * @see clear
   */
  TEST_reset(): void {
    this._cacheInitialized = false;
    this.clear();
    this._builtins.clear();
    this._internal.clear();
  }
}

export default MemoryRegistry;
