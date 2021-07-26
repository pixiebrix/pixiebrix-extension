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

import { ComponentRef, PanelComponent } from "@/extensionPoints/dom";
import React, { useMemo } from "react";
import { PanelEntry } from "@/actionPanel/protocol";
import GridLoader from "react-spinners/GridLoader";
import blockRegistry from "@/blocks/registry";
import { useAsyncState } from "@/hooks/common";
import ConsoleLogger from "@/tests/ConsoleLogger";
// @ts-expect-error -- no type definitions exist for react-shadow-root
import ReactShadowRoot from "react-shadow-root";

// Import the built-in bricks
import "@/blocks";
import "@/contrib";
import { getErrorMessage } from "@/errors";

const BodyComponent: React.FunctionComponent<{
  body: string | ComponentRef;
}> = ({ body }) =>
  useMemo(() => {
    if (typeof body === "string") {
      return (
        <div
          style={{ height: "100%" }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }

    const { Component, props } = body;
    return <Component {...props} />;
  }, [body]);

const PanelBody: React.FunctionComponent<{ panel: PanelEntry }> = ({
  panel,
}) => {
  const [component, pending, error] = useAsyncState(async () => {
    if (!panel.payload) {
      return null;
    }

    if ("error" in panel.payload) {
      const { error } = panel.payload;
      return (
        <div className="text-danger p-3">Error running panel: {error}</div>
      );
    }

    const { blockId, ctxt, args } = panel.payload;
    console.debug("Render panel body", panel.payload);
    const block = await blockRegistry.lookup(blockId);
    const body = await block.run(args, {
      ctxt,
      root: null,
      logger: new ConsoleLogger(),
    });
    return (
      <div className="h-100">
        <ReactShadowRoot>
          <BodyComponent body={body as PanelComponent} />
        </ReactShadowRoot>
      </div>
    );
  }, [panel.payload?.key]);

  if (error) {
    return (
      <div className="text-danger">
        Error rendering panel: {getErrorMessage(error as Error)}
      </div>
    );
  }

  if (pending || component == null) {
    return <GridLoader />;
  }

  return component;
};

export default PanelBody;
