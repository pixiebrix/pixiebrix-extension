import { registerBlock } from "@/blocks/registry";
import { Reader } from "@/types";
import { Schema } from "@/core";

class BlankReader extends Reader {
  constructor() {
    super("@pixiebrix/blank", "Reader that returns no data");
  }

  async read() {
    return {};
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {},
    additionalProperties: false,
  };

  async isAvailable() {
    return true;
  }
}

registerBlock(new BlankReader());
