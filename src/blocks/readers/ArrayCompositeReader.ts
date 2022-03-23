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

import { Reader } from "@/types";
import { IReader, ReaderOutput } from "@/core";
import { zip } from "lodash";

class ArrayCompositeReader extends Reader {
  private readonly _readers: IReader[];

  constructor(readers: IReader[]) {
    super(
      undefined,
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
    return availability.every((x) => x);
  }

  override async isPure(): Promise<boolean> {
    const availability = await Promise.all(
      this._readers.map(async (x) => x.isPure())
    );
    return availability.every((x) => x);
  }

  override async isRootAware(): Promise<boolean> {
    const awareness = await Promise.all(
      this._readers.map(async (x) => x.isRootAware())
    );
    return awareness.some((x) => x);
  }

  async read(root: HTMLElement | Document): Promise<ReaderOutput> {
    let result = {};
    const readResults = await Promise.all(
      this._readers.map(async (x) => x.read(root))
    );
    for (const [reader, readerResult] of zip(this._readers, readResults)) {
      console.debug(`ArrayCompositeReader:${reader.name}`, readerResult);
      result = { ...result, ...readerResult };
    }

    return result;
  }
}

export default ArrayCompositeReader;
