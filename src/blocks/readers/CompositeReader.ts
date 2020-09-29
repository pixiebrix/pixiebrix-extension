import { Reader } from "@/types";
import { IReader, Schema } from "@/core";
import mapValues from "lodash/mapValues";
import identity from "lodash/identity";
import fromPairs from "lodash/fromPairs";

class CompositeReader extends Reader {
  public readonly outputSchema: Schema;
  private readonly _readers: { [key: string]: IReader };

  constructor(readers: { [key: string]: IReader }) {
    super(undefined, "Composite Reader", "Combination of multiple readers");
    this._readers = readers;
    this.outputSchema = {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: mapValues(this._readers, (x) => x.outputSchema),
      required: Object.keys(this._readers),
    };
  }

  async isAvailable() {
    const readerArray = Object.values(this._readers);
    // PERFORMANCE: could return quicker if any came back false using Promise.any
    return (await Promise.all(readerArray.map((x) => x.isAvailable()))).every(
      identity
    );
  }

  async read() {
    const readOne = async (key: string, reader: IReader) => [
      key,
      await reader.read(),
    ];
    const resultPairs = await Promise.all(
      Object.entries(this._readers).map(([key, reader]) => readOne(key, reader))
    );
    return fromPairs(resultPairs);
  }
}

export default CompositeReader;
