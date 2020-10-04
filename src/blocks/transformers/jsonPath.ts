import { JSONPath } from "jsonpath-plus";
import { Transformer } from "@/types";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";

export class JSONPathTransformer extends Transformer {
  constructor() {
    super(
      "@pixiebrix/jsonpath",
      "JSONPath",
      "Apply a JSONPath expression: https://github.com/s3u/JSONPath",
      faCode
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "JSONPath expression",
      },
    },
  };

  async transform({ path }: BlockArg, { ctxt }: BlockOptions) {
    return JSONPath({ preventEval: true, path, json: ctxt });
  }
}

registerBlock(new JSONPathTransformer());
