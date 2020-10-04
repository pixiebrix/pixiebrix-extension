import { readStorage, setStorage } from "@/chrome";
import axios from "axios";
import flatten from "lodash/flatten";
import { getBaseURL } from "@/services/baseService";
import compact from "lodash/compact";
import urljoin from "url-join";
import isPlainObject from "lodash/isPlainObject";
import pickBy from "lodash/pickBy";

const LOCAL_SCOPE = "@local";

interface RegistryItem {
  id: string;
}

export class DoesNotExistError<TItem extends RegistryItem> extends Error {
  constructor(id: string) {
    super(`${id} does not exist`);
    this.name = "DoesNotExistError";
  }
}

export class Registry<TItem extends RegistryItem> {
  private data: { [key: string]: TItem };
  private readonly resourcePath: string;
  private readonly storageKey: string;
  private readonly deserialize: (raw: any) => TItem;
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
      console.debug("Installed blocks", this.data);
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
      }
      if (item.id == null) {
        console.warn(`Skipping item with no id`, item);
        continue;
      }
      this.data[item.id] = item;
    }
  }

  _parse(raw: any): TItem | undefined {
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
    const serviceUrl = await getBaseURL();
    const url = urljoin(serviceUrl, "api", this.resourcePath, "/");
    const { data } = await axios.get(url);

    if (!Array.isArray(data)) {
      throw new Error(`Expected array from ${this.resourcePath}`);
    }

    if (chrome?.storage) {
      await setStorage(this.storageKey, JSON.stringify(data));
    }

    const parsed = compact(flatten(data.map((x) => this._parse(x))));

    console.debug(`Fetched ${parsed.length} items from ${url}`);

    this.register(...parsed);
  }

  async refresh({ allowFetch } = { allowFetch: true }) {
    if (this.refreshed) {
      return;
    } else if (!chrome?.storage) {
      throw new Error(
        "Cannot refresh when not running in an extension context"
      );
    }

    const raw = await readStorage(this.storageKey);

    let data;
    try {
      data = raw ? JSON.parse(raw as string) : [];
    } catch {
      console.error("Raw storage", raw);
      throw new Error("Error refreshing configuration from storage");
    }

    // Load local first
    if (data?.length) {
      const parsed: TItem[] = compact(data.map((x: unknown) => this._parse(x)));
      this.register(...flatten(parsed));
    }

    if (allowFetch) {
      await this.fetch();
    } else if (!data?.length) {
      throw new Error("No items stored locally and fetch is not allowed");
    }

    this.refreshed = true;
  }

  clear(): void {
    this.data = {};
  }
}

export default Registry;
