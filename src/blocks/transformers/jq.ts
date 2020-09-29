// @ts-ignore: no existing definitions exist
import jq from "jq-web";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class JQTransformer extends Transformer {
  constructor() {
    super(
      "pixiebrix/contrib-jq",
      "jq - JSON processor",
      "Apply a jq expression: https://stedolan.github.io/jq/",
      faCode
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      filter: {
        type: "string",
        description: "jq filter expression",
      },
      data: {
        description:
          "The input data, or blank to process the data from the previous step",
      },
    },
    ["filter"]
  );

  async transform({ filter, data }: BlockArg, { ctxt }: BlockOptions) {
    const input = (data ?? "").trim() !== "" ? data : ctxt;
    console.debug("pixiebrix/contrib-jq", { filter, data, ctxt, input });
    return await jq.promised.json(input, filter);
  }
}

registerBlock(new JQTransformer());
