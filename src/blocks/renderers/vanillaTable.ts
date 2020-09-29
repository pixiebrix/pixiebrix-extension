import { Renderer } from "@/types";
import { faTable } from "@fortawesome/free-solid-svg-icons";
import makeDataTable, { Row } from "@/blocks/renderers/dataTable";
import { registerBlock } from "@/blocks/registry";
import Mustache from "mustache";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions } from "@/core";

export class VanillaTable extends Renderer {
  constructor() {
    super(
      "pixiebrix/contrib-table",
      "A customizable table",
      "A customizable table that displays a list of values",
      faTable
    );
  }

  inputSchema = propertiesToSchema({
    columns: {
      type: "array",
      description: "Column labels and values to show",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          property: { type: "string" },
          href: { type: "string" },
        },
        required: ["label", "property"],
      },
      minItems: 1,
    },
  });

  async render({ columns, ...blockArgs }: BlockArg, { ctxt }: BlockOptions) {
    if (!Array.isArray(ctxt)) {
      throw new Error("Expected data to be an array");
    }

    const makeLinkRenderer = (href: string) => (value: any, row: Row) => {
      const anchorHref = Mustache.render(href, { ...row, "@block": blockArgs });
      return `<a href="${anchorHref}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    };

    const table = makeDataTable(
      columns.map(({ label, property, href }: any) => ({
        label,
        property,
        renderer: href ? makeLinkRenderer(href) : undefined,
      }))
    );

    return table(ctxt);
  }
}

registerBlock(new VanillaTable());
