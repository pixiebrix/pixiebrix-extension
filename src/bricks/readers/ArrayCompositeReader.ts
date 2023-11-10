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

import { type Reader, ReaderABC } from "@/types/bricks/readerTypes";
import { type JsonObject } from "type-fest";

class ArrayCompositeReader extends ReaderABC {
  private readonly _readers: Reader[];

  constructor(readers: Reader[]) {
    super(
      "@pixiebrix/array-composite-reader",
      "Array Composite Reader",
      "Combination of multiple readers"
    );

    this._readers = readers;

    if (this._readers.some((x) => !x.outputSchema)) {
      console.error(
        "One or more readers are missing an outputSchema",
        this._readers
      );
      throw new Error("One or more readers are missing an outputSchema");
    }

    const properties = {};
    for (const reader of this._readers) {
      Object.assign(properties, reader.outputSchema.properties);
    }

    this.outputSchema = {
      properties,
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
    };
  }

  async isAvailable(): Promise<boolean> {
    const availability = await Promise.all(
      this._readers.map(async (x) => x.isAvailable())
    );
    return availability.every(Boolean);
  }

  override async isPure(): Promise<boolean> {
    const availability = await Promise.all(
      this._readers.map(async (x) => x.isPure())
    );
    return availability.every(Boolean);
  }

  override async isRootAware(): Promise<boolean> {
    const awareness = await Promise.all(
      this._readers.map(async (x) => x.isRootAware())
    );
    return awareness.some(Boolean);
  }

  async read(root: HTMLElement | Document): Promise<JsonObject> {
    const readResults = this._readers.map(async (reader) => {
      const result = await reader.read(root);
      console.debug(`ArrayCompositeReader:${reader.name}`, result);
      return result;
    });

    return Object.assign({}, ...(await Promise.all(readResults)));
  }
}

export default ArrayCompositeReader;
