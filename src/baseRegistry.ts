/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { readStorage, setStorage } from "@/chrome";
import flatten from "lodash/flatten";
import { fetch } from "@/hooks/fetch";
import compact from "lodash/compact";
import isPlainObject from "lodash/isPlainObject";
import pickBy from "lodash/pickBy";
import isEmpty from "lodash/isEmpty";

const LOCAL_SCOPE = "@local";

interface RegistryItem {
  id: string;
}

export class DoesNotExistError extends Error {
  constructor(id: string) {
    super(`${id} does not exist`);
    this.name = "DoesNotExistError";
  }
}

export class Registry<TItem extends RegistryItem> {
  private data: { [key: string]: TItem };
  private readonly resourcePath: string;
  private readonly storageKey: string;
  private readonly deserialize: (raw: unknown) => TItem;
  private refreshed: boolean;

  constructor(
    storageKey: string,
    resourcePath: string,
    deserialize: (raw: unknown) => TItem
  ) {
    this.data = {};
    this.resourcePath = resourcePath;
    this.refreshed = false;
    this.storageKey = storageKey;
    this.deserialize = deserialize;
  }

  lookup(id: string): TItem {
    if (!id) {
      throw new Error("id is required");
    }
    const result = this.data[id];
    if (!result) {
      console.debug(
        `Cannot find ${id} for in registry ${this.resourcePath}`,
        this.data
      );
      throw new DoesNotExistError(id);
    }
    return result;
  }

  all(): TItem[] {
    return Object.values(this.data);
  }

  local(): TItem[] {
    return Object.values(
      pickBy(this.data, (value, key) => key.startsWith(`${LOCAL_SCOPE}/`))
    );
  }

  register(...items: TItem[]): void {
    for (const item of flatten(items)) {
      if (!item) {
        console.warn("Register received a null/undefined item");
        continue;
      } else if (item.id == null) {
        console.warn(`Skipping item with no id`, item);
        continue;
      }
      // console.debug(`Registered ${item.id}`);
      this.data[item.id] = item;
    }
  }

  _parse(raw: unknown): TItem | undefined {
    let obj;
    try {
      if (typeof raw === "string") {
        obj = JSON.parse(raw);
      } else if (isPlainObject(raw)) {
        obj = raw;
      } else {
        console.warn(
          `Error de-serializing item, got unexpected type ${typeof obj}`
        );
        return;
      }
      return this.deserialize(obj);
    } catch (e) {
      console.warn(`Error de-serializing item: ${e}`, raw);
      return undefined;
    }
  }

  async fetch(): Promise<void> {
    const data = await fetch(`/api/${this.resourcePath}/`);

    if (!Array.isArray(data)) {
      console.error(`Expected array from ${this.resourcePath}`, data);
      throw new Error(`Expected array from ${this.resourcePath}`);
    }

    if (chrome?.storage) {
      await setStorage(this.storageKey, JSON.stringify(data));
    }

    const parsed = compact(flatten(data.map((x) => this._parse(x))));

    this.register(...parsed);
  }

  async loadLocal(): Promise<void> {
    const raw = await readStorage(this.storageKey);

    let data;
    try {
      data = raw ? JSON.parse(raw as string) : [];
    } catch (err) {
      console.error("Raw storage", { raw, err });
      throw new Error(`Error refreshing configuration from storage: ${err}`);
    }

    if (!Array.isArray(data)) {
      throw new Error("Invalid storage contents");
    }

    const parsed: TItem[] = compact(data.map((x: unknown) => this._parse(x)));
    this.register(...flatten(parsed));
  }

  async refresh({ allowFetch } = { allowFetch: true }): Promise<void> {
    if (this.refreshed) {
      return;
    } else if (!chrome?.storage) {
      throw new Error("Can only refresh when running in an extension context");
    }

    await this.loadLocal();

    if (allowFetch) {
      await this.fetch();
    } else if (isEmpty(this.data)) {
      console.warn("No items stored locally and fetch is not allowed");
    }

    this.refreshed = true;
  }

  clear(): void {
    this.data = {};
  }
}

export default Registry;
