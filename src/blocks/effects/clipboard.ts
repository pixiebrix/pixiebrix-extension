import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import copy from "copy-to-clipboard";
import { BlockArg, BlockOptions, Schema } from "@/core";

export class CopyToClipboard extends Effect {
  constructor() {
    super(
      "@pixiebrix/clipboard/copy",
      "Copy to clipboard",
      "Copy content to your clipboard"
    );
  }

  permissions = {
    permissions: ["clipboardWrite"],
  };

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      text: {
        type: "string",
      },
    },
  };

  async effect({ text }: BlockArg, options: BlockOptions) {
    copy(text);
  }
}

registerBlock(new CopyToClipboard());
