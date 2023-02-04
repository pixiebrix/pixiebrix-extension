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
import { registry } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type RegistryId } from "@/core";
import { expectContext } from "@/utils/expectContext";
import { memoizeUntilSettled } from "@/utils";

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

const databaseChangeListeners: DatabaseChangeListener[] = [];

// XXX: should this be throttled instead?
export const fetchNewPackages = memoizeUntilSettled(async () => {
  expectContext("extension");

  const changed = await registry.fetch();

  if (changed) {
    for (const listener of databaseChangeListeners) {
      listener.onChanged();
    }
  }
});

/**
 * Local brick registry backed by IDB.
 */
export class Registry<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>
> {
  private readonly cache = new Map<RegistryId, Item>();

  public readonly kinds: Set<Kind>;

  private readonly deserialize: (raw: unknown) => Item;

  private listeners: RegistryChangeListener[] = [];

  constructor(kinds: Kind[], deserialize: (raw: unknown) => Item) {
    this.kinds = new Set(kinds);
    this.deserialize = deserialize;

    databaseChangeListeners.push({
      onChanged: () => {
        this.cache.clear();
      },
    });
  }

  addListener(listener: RegistryChangeListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: RegistryChangeListener): void {
    this.listeners = this.listeners.filter((x) => x !== listener);
  }

  private notifyAll() {
    for (const listener of this.listeners) {
      listener.onCacheChanged();
    }
  }

  async exists(id: Id): Promise<boolean> {
    return this.cache.has(id) || (await registry.find(id)) != null;
  }

  async lookup(id: Id): Promise<Item> {
    if (!id) {
      throw new Error("id is required");
    }

    const cached = this.cache.get(id);

    if (cached) {
      return cached;
    }

    // Look up in IDB
    const raw = await registry.find(id);

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

    this.register(item);

    return item;
  }

  /**
   * @deprecated needed for header generation; will be removed in future versions
   * @see all
   */
  cached(): Item[] {
    return [...this.cache.values()];
  }

  /**
   * Reloads all brick configurations from IDB, and returns all bricks in the registry.
   * @deprecated requires all data to be parsed
   * @see cached
   */
  async all(): Promise<Item[]> {
    const parsedItems: Item[] = [];

    const all = await registry.getByKinds([...this.kinds.values()]);

    for (const raw of all) {
      try {
        const parsed = this.parse(raw.config);
        if (parsed) {
          parsedItems.push(parsed);
        }
      } catch {
        // NOP
      }
    }

    console.debug(
      "Parsed %d registry item(s) from IDB for %s",
      parsedItems.length,
      [...this.kinds].join(", ")
    );

    // Perform as single call to register so listeners are notified once
    this.register(...parsedItems);

    return this.cached();
  }

  register(...items: Item[]): void {
    let changed = false;

    for (const item of items) {
      if (item.id == null) {
        console.warn("Skipping item with no id", item);
        continue;
      }

      this.cache.set(item.id, item);
      changed = true;
    }

    if (changed) {
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
   * Clear the registry cache.
   */
  clear(): void {
    this.cache.clear();
    this.notifyAll();
  }
}

export default Registry;
