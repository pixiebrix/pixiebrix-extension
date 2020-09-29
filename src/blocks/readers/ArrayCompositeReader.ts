import { Reader } from "@/types";
import { IReader, Schema } from "@/core";
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

    this.outputSchema = {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: this._readers.reduce(
        (acc, reader) => ({ ...acc, ...reader.outputSchema.properties }),
        {}
      ),
    };
  }

  async isAvailable() {
    return (await Promise.all(this._readers.map((x) => x.isAvailable()))).every(
      identity
    );
  }

  async read() {
    let result = {};
    const readResults = await Promise.all(this._readers.map((x) => x.read()));
    for (const [reader, readerResult] of zip(this._readers, readResults)) {
      console.debug(`ArrayCompositeReader:${reader.name}`, readerResult);
      result = { ...result, ...readerResult };
    }
    return result;
  }
}

export default ArrayCompositeReader;
