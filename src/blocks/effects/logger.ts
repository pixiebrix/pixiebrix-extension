import { Effect } from "@/types";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class LogEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/log",
      "Log To Console",
      "Log a message to the Browser's console",
      faSearch
    );
  }

  inputSchema: Schema = propertiesToSchema({
    message: {
      type: "string",
      description: "The message to log",
    },
  });

  async effect({ message }: BlockArg, { ctxt }: BlockOptions) {
    console.log(message, ctxt);
  }
}

registerBlock(new LogEffect());
