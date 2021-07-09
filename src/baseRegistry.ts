/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import {
  find,
  getKind,
  PACKAGE_NAME_REGEX,
  Kind,
  syncRemote,
} from "@/registry/localRegistry";
import { groupBy } from "lodash";
import { RegistryPackage } from "@/types/contract";

export interface RegistryItem {
  id: string;
}

export class DoesNotExistError extends Error {
  public readonly id: string;

  constructor(id: string) {
    super("Registry item does not exist");
    this.name = "DoesNotExistError";
    this.id = id;
  }
}

export class Registry<TItem extends RegistryItem> {
  private cache: { [key: string]: TItem };
  private remote: Set<string>;
  private readonly remoteResourcePath: string;
  public readonly kinds: Set<Kind>;
  private readonly deserialize: (raw: unknown) => TItem;

  constructor(
    kinds: Kind[],
    remoteResourcePath: string,
    deserialize: (raw: unknown) => TItem
  ) {
    this.cache = {};
    this.remote = new Set<string>();
    this.kinds = new Set(kinds);
    this.remoteResourcePath = remoteResourcePath;
    this.deserialize = deserialize;
  }

  async exists(id: string): Promise<boolean> {
    return (
      Object.prototype.hasOwnProperty.call(this.cache, id) ||
      (await find(id)) != null
    );
  }

  async lookup(id: string): Promise<TItem> {
    if (!id) {
      throw new Error("id is required");
    }

    const cached = this.cache[id];

    if (cached) {
      return cached;
    }

    const raw = await find(id);

    if (!raw) {
      console.debug(`Cannot find ${id} in registry ${this.remoteResourcePath}`);
      throw new DoesNotExistError(id);
    }

    const item = this.parse(raw.config);

    if (!item) {
      throw new Error(`Unable to parse block ${item}`);
    }

    this.register(item);

    return item;
  }

  /**
   * @deprecated needed for header generation; will be removed in future versions
   */
  cached(): TItem[] {
    return Object.values(this.cache);
  }

  /**
   * @deprecated requires all data to be parsed
   */
  async all(): Promise<TItem[]> {
    for (const kind of this.kinds.values()) {
      for (const raw of await getKind(kind)) {
        const parsed = this.parse(raw.config);
        if (parsed) {
          this.register(parsed);
        }
      }
    }
    return Object.values(this.cache);
  }

  register(...items: TItem[]): void {
    for (const item of items) {
      if (item.id == null) {
        console.warn(`Skipping item with no id`, item);
        continue;
      }
      this.cache[item.id] = item;
    }
  }

  private parse(raw: unknown): TItem | undefined {
    try {
      return this.deserialize(raw);
    } catch (error) {
      console.warn(`Error de-serializing item: ${error}`, raw);
      return undefined;
    }
  }

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

      const match = item.metadata.id.match(PACKAGE_NAME_REGEX);

      if (!this.kinds.has(item.kind)) {
        console.warn(
          `Item ${item.metadata?.id ?? "<unknown>"} has kind ${
            item.kind
          }; expected: ${[...this.kinds.values()].join(", ")}`
        );
      }

      delete this.cache[item.metadata.id];

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

    for (const [kind, kindPackages] of Object.entries(
      groupBy(packages, (x) => x.kind)
    )) {
      await syncRemote(kind as Kind, kindPackages);
    }
  }

  clear(): void {
    this.cache = {};
  }
}

export default Registry;
