/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from "react";
import { Renderer } from "@/types";
import { BlockArg, BlockOptions, ComponentRef, Schema } from "@/core";
import { loadBrickYaml } from "@/runtime/brickYaml";
import InnerComponentContext from "@/blocks/renderers/documentView/InnerComponentContext";

import BootstrapStylesheet from "./BootstrapStylesheet";

export class DocumentRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/document",
      "Render Document",
      "Render an interactive document"
    );
  }

  inputSchema: Schema = {
    properties: {
      body: {
        oneOf: [
          {
            type: "string",
            description: "A YAML document config to render",
          },
          {
            type: "object",
            description: "A document configuration",
            additionalProperties: true,
          },
        ],
      },
    },
    required: ["body"],
  };

  async render(
    { body }: BlockArg,
    options: BlockOptions
  ): Promise<ComponentRef> {
    const bodyObj =
      typeof body === "string"
        ? // Using loadBrickYaml here in order to support !pipeline expressions. If there's any expressions (e.g., !var),
          // etc. outside of a !pipeline expression, the rendering will probably crash
          loadBrickYaml(body)
        : body;

    // Dynamic import because documentView has a transitive dependency of react-shadow-root which assumed a proper
    // `window` variable is present on module load. This isn't available on header generation
    const { default: ReactShadowRoot } = await import("react-shadow-root");
    const { getComponent } = await import(
      "@/blocks/renderers/documentView/documentView"
    );

    const { Component, props } = getComponent(bodyObj);

    // Wrap in a React context provider that passes BlockOptions down to any embedded bricks
    // ReactShadowRoot needs to be inside an HTMLElement so it has something to attach to
    const WrappedComponent = (props: any) => (
      <InnerComponentContext.Provider value={{ options }}>
        <div className="h-100">
          <ReactShadowRoot>
            <BootstrapStylesheet />
            <Component {...props} />
          </ReactShadowRoot>
        </div>
      </InnerComponentContext.Provider>
    );

    return {
      Component: WrappedComponent,
      props,
    };
  }
}
