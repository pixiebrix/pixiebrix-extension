import { Renderer } from "@/types";
import Mustache from "mustache";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions } from "@/core";

export const tableTemplate = `
    <table>
        <thead>
        <tr>
            <th>Property</th>
            <th>Value</th>
        </tr>
        </thead>
        <tbody>
            {{#entries}}
                <tr>
                    <td>{{key}}</td>
                    <td>{{value}}</td>
                </tr>
            {{/entries}}
        </tbody>
    </table>
`;

export class PropertyTableRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/property-table",
      "Property Table",
      "Shows all properties and their values"
    );
  }

  inputSchema = propertiesToSchema({});

  async render(inputs: BlockArg, { ctxt }: BlockOptions) {
    return Mustache.render(tableTemplate, {
      entries: Object.entries(ctxt).map(([key, value]) => ({ key, value })),
    });
  }
}

registerBlock(new PropertyTableRenderer());
