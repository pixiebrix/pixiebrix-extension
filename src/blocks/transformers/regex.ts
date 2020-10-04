import { Transformer } from "@/types";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class RegexTransformer extends Transformer {
  constructor() {
    super(
      "@pixiebrix/regex",
      "Regex Extractor",
      "Extract data using a Regex (regular expression)",
      faCode
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      regex: {
        type: "string",
      },
      input: {
        oneOf: [
          { type: ["string", "null"] },
          { type: "array", items: { type: ["string", "null"] } },
        ],
      },
      ignoreCase: {
        type: "boolean",
      },
    },
    ["regex", "input"]
  );

  async transform({ regex, input }: BlockArg, { ctxt }: BlockOptions) {
    const compiled = RegExp(regex);

    const extract = (x: string | null) => {
      if (x == null) return null;
      const match = compiled.exec(x);
      console.debug(`Search for ${regex} in ${x}`, match);
      return match?.groups;
    };

    return Array.isArray(input) ? input.map(extract) : extract(input);
  }
}

registerBlock(new RegexTransformer());
