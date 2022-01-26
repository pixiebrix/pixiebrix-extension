/* eslint-disable filenames/match-exported */
/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { fetch } from "@/hooks/fetch";
import { PACKAGE_NAME_REGEX, Kind } from "@/registry/localRegistry";
import { registry } from "@/background/messenger/api";
import { groupBy } from "lodash";
import { RegistryPackage } from "@/types/contract";
import { getErrorMessage } from "@/errors";
import { RegistryId } from "@/core";

export interface RegistryItem<T extends RegistryId = RegistryId> {
  id: T;
}

export class DoesNotExistError extends Error {
  public readonly id: string;

  constructor(id: string) {
    super("Registry item does not exist");
    this.name = "DoesNotExistError";
    this.id = id;
  }
}

/**
 * Local brick registry backed by IDB.
 */
export class Registry<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>
> {
  // Use RegistryId for `cache` and `remote` because they come from the external service

  private readonly cache = new Map<RegistryId, Item>();

  private readonly remote: Set<RegistryId>;

  private readonly remoteResourcePath: string;

  public readonly kinds: Set<Kind>;

  private readonly deserialize: (raw: unknown) => Item;

  constructor(
    kinds: Kind[],
    remoteResourcePath: string,
    deserialize: (raw: unknown) => Item
  ) {
    this.remote = new Set<Id>();
    this.kinds = new Set(kinds);
    this.remoteResourcePath = remoteResourcePath;
    this.deserialize = deserialize;
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

    const raw = await registry.find(id);

    if (!raw) {
      console.debug(
        `Cannot find ${id as string} in registry ${this.remoteResourcePath}`
      );
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
   */
  cached(): Item[] {
    return [...this.cache.values()];
  }

  /**
   * @deprecated requires all data to be parsed
   */
  async all(): Promise<Item[]> {
    await Promise.allSettled(
      [...this.kinds.values()].map(async (kind) => {
        for (const raw of await registry.getKind(kind)) {
          const parsed = this.parse(raw.config);
          if (parsed) {
            this.register(parsed);
          }
        }
      })
    );
    return [...this.cache.values()];
  }

  register(...items: Item[]): void {
    for (const item of items) {
      if (item.id == null) {
        console.warn("Skipping item with no id", item);
        continue;
      }

      this.cache.set(item.id, item);
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
   * Fetch remote brick definitions.
   */
  async fetch(): Promise<void> {
    const timestamp = new Date();

    this.remote.clear();

    const data = await fetch<RegistryPackage[]>(
      `/api/${this.remoteResourcePath}/`
    );

    if (!Array.isArray(data)) {
      console.error(`Expected array from ${this.remoteResourcePath}`, data);
      throw new Error(`Expected array from ${this.remoteResourcePath}`);
    }

    const packages = [];

    for (const item of data) {
      const [major, minor, patch] = item.metadata.version
        .split(".")
        .map((x) => Number.parseInt(x, 10));

      const match = PACKAGE_NAME_REGEX.exec(item.metadata.id);

      if (!this.kinds.has(item.kind)) {
        console.warn(
          `Item ${item.metadata?.id ?? "[[unknown]]"} has kind ${
            item.kind
          }; expected: ${[...this.kinds.values()].join(", ")}`
        );
      }

      this.cache.delete(item.metadata.id);

      packages.push({
        id: item.metadata.id,
        version: { major, minor, patch },
        scope: match.groups.scope,
        kind: item.kind,
        config: item,
        rawConfig: undefined,
        timestamp,
      });

      this.remote.add(item.metadata.id);
    }

    await Promise.all(
      Object.entries(groupBy(packages, (x) => x.kind)).map(
        async ([kind, kindPackages]) => {
          await registry.syncRemote(kind as Kind, kindPackages);
        }
      )
    );
  }

  /**
   * Clear the registry cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

export default Registry;
