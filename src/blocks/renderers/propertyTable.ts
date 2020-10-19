import { Renderer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, BlockOptions, RenderedHTML } from "@/core";
import { isPlainObject, orderBy } from "lodash";

import "@webcomponents/custom-elements";
// register the "vaadin-grid" element
import "@vaadin/vaadin-grid/vaadin-grid.js";
import "@vaadin/vaadin-grid/vaadin-grid-sort-column.js";

function shapeData(inputs: unknown) {
  if (isPlainObject(inputs)) {
    return Object.entries(inputs).map(([name, value]) => ({
      name,
      value,
      hasChildren: "false",
    }));
  } else if (Array.isArray(inputs)) {
    throw new Error("Not implemented for arrays");
  } else {
    throw new Error("Not implemented for primitives");
  }
}

export class PropertyTableRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/property-table",
      "Property Table",
      "Shows all properties and their values"
    );
  }

  inputSchema = propertiesToSchema({});

  async render(
    inputs: BlockArg,
    { ctxt }: BlockOptions
  ): Promise<RenderedHTML> {
    // https://vaadin.com/components/vaadin-tree-grid/html-examples/grid-tree-demos

    const data = shapeData(ctxt);

    // <vaadin-grid-tree-column path="name" header="Property" width="30em" item-has-children-path="hasChildren"></vaadin-grid-tree-column>

    return {
      component: `<vaadin-grid theme="row-stripes" aria-label="Property Tree Grid" data-provider="[[_dataProvider]]">
            <vaadin-grid-sort-column path="name" header="Property"></vaadin-grid-sort-column>
            <vaadin-grid-column path="value" header="Value"></vaadin-grid-column>
          </vaadin-grid>`,
      data: {
        dataProvider: function (params: any, callback: any) {
          const startIndex = params.page * params.pageSize;

          let items = data;

          if (params.sortOrders?.length) {
            items = orderBy(
              data,
              params.sortOrders.map((x: any) => x.path),
              params.sortOrders.map((x: any) => x.direction)
            );
          }

          const pageItems = items.slice(
            startIndex,
            startIndex + params.pageSize
          );
          // Inform grid of the requested tree level's full size
          const treeLevelSize = data.length;
          console.debug("dataProvider", { pageItems, params, data });

          callback(pageItems, treeLevelSize);
        },
      },
    } as any;
  }
}

registerBlock(new PropertyTableRenderer());
