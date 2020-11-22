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

import { Reader } from "@/types";
import { IReader, ReaderOutput, Schema } from "@/core";
import identity from "lodash/identity";
import zip from "lodash/zip";

class ArrayCompositeReader extends Reader {
  public readonly outputSchema: Schema;
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

    this.outputSchema = {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: this._readers.reduce(
        (acc, reader) => ({
          ...acc,
          ...(reader.outputSchema.properties ?? {}),
        }),
        {}
      ),
    };
  }

  async isAvailable(): Promise<boolean> {
    return (await Promise.all(this._readers.map((x) => x.isAvailable()))).every(
      identity
    );
  }

  async read(root: HTMLElement | Document): Promise<ReaderOutput> {
    let result = {};
    const readResults = await Promise.all(
      this._readers.map((x) => x.read(root))
    );
    for (const [reader, readerResult] of zip(this._readers, readResults)) {
      console.debug(`ArrayCompositeReader:${reader.name}`, readerResult);
      result = { ...result, ...readerResult };
    }
    return result;
  }
}

export default ArrayCompositeReader;
