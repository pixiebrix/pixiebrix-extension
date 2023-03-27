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

import { type Kind } from "@/registry/localRegistry";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type RegistryId } from "@/core";
import { expectContext } from "@/utils/expectContext";
import { memoizeUntilSettled } from "@/utils";

type Source = "remote" | "builtin";

export interface RegistryItem<T extends RegistryId = RegistryId> {
  id: T;
}

export class DoesNotExistError extends Error {
  override name = "DoesNotExistError";
  public readonly id: string;

  constructor(id: string) {
    super(`Registry item does not exist: ${id}`);
    this.id = id;
  }
}

export type RegistryChangeListener = {
  onCacheChanged: () => void;
};

type DatabaseChangeListener = {
  onChanged: () => void;
};

/**
 * `backgroundRegistry` database change listeners.
 */
const databaseChangeListeners: DatabaseChangeListener[] = [];

function notifyDatabaseListeners() {
  for (const listener of databaseChangeListeners) {
    listener.onChanged();
  }
}

/**
 * Replace IDB with remote packages and notify listeners.
 */
export const syncRemotePackages = memoizeUntilSettled(async () => {
  expectContext("extension");

  await backgroundRegistry.syncRemote();
  notifyDatabaseListeners();
});

/**
 * Clear packages in the local database, and notify listeners.
 */
export const clearPackages = async () => {
  expectContext("extension");

  await backgroundRegistry.clear();
  notifyDatabaseListeners();
};

/**
 * Brick registry, with remote bricks backed by IDB.
 */
export class Registry<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>
> {
  /**
   * Registered built-in items. Used to keep track of built-ins across cache clears.
   * @private
   */
  private readonly _builtins = new Map<RegistryId, Item>();

  /**
   * Cache of items in the registry. Contains both built-ins and remote items.
   * @private
   */
  private readonly _cache = new Map<RegistryId, Item>();

  /**
   * Track the state of the cache
   * @private
   */
  private _cacheInitialized = false;

  public readonly kinds: Set<Kind>;

  private readonly deserialize: (raw: unknown) => Item;

  private listeners: RegistryChangeListener[] = [];

  constructor(kinds: Kind[], deserialize: (raw: unknown) => Item) {
    this.kinds = new Set(kinds);
    this.deserialize = deserialize;

    databaseChangeListeners.push({
      onChanged: () => {
        // If database changes, clear the cache to force reloading user-defined bricks
        this.clear();
      },
    });
  }

  /**
   * Add a change listener
   * @param listener the change listener
   */
  addListener(listener: RegistryChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a change listener
   * @param listener the change listener
   */
  removeListener(listener: RegistryChangeListener): void {
    this.listeners = this.listeners.filter((x) => x !== listener);
  }

  private notifyAll() {
    for (const listener of this.listeners) {
      listener.onCacheChanged();
    }
  }

  /**
   * Return true if the registry contains the given item
   * @param id the registry id
   */
  async exists(id: Id): Promise<boolean> {
    return this._cache.has(id) || (await backgroundRegistry.find(id)) != null;
  }

  /**
   * Return the item with the given id, or throw an error if it does not exist
   * @param id the registry id
   * @throws DoesNotExistError if the item does not exist
   * @see exists
   */
  async lookup(id: Id): Promise<Item> {
    if (!id) {
      throw new Error("id is required");
    }

    const cached = this._cache.get(id);

    if (cached) {
      return cached;
    }

    const builtin = this._builtins.get(id);

    if (builtin) {
      return builtin;
    }

    // Look up in IDB
    const raw = await backgroundRegistry.find(id);

    if (!raw) {
      console.debug(`Cannot find ${id as string} in registry`);
      throw new DoesNotExistError(id);
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
   * Return built-in JS bricks registered
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

    const remoteItems = packages.map((raw) => this.parse(raw.config));

    console.debug(
      "Parsed %d registry item(s) from IDB for %s",
      remoteItems.length,
      [...this.kinds].join(", ")
    );

    // Perform as single call to register so listeners are notified once
    this.register(remoteItems, { source: "remote", notify: false });
    this.register([...this._builtins.values()], {
      source: "builtin",
      notify: false,
    });
    this.notifyAll();

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
    }: { source?: Source; notify?: boolean } = {}
  ): void {
    let changed = false;

    for (const item of items) {
      if (item.id == null) {
        console.warn("Skipping item with no id", item);
        continue;
      }

      if (source === "builtin") {
        this._builtins.set(item.id, item);
      }

      this._cache.set(item.id, item);
      changed = true;
    }

    if (changed && notify) {
      this.notifyAll();
    }
  }

  private parse(raw: unknown): Item | undefined {
    try {
      return this.deserialize(raw);
    } catch (error) {
      console.warn(
        "Error de-serializing item: %s",
        getErrorMessage(error),
        raw
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
    this.notifyAll();
  }

  /**
   * Test-only method to completely reset the registry state. Does NOT notify listeners
   * @see clear
   */
  TEST_reset(): void {
    this._cacheInitialized = false;
    this.clear();
    this._builtins.clear();
  }
}

export default Registry;
