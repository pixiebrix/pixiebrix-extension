/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ComponentRef } from "@/extensionPoints/dom";
import React, { useMemo } from "react";
import { PanelEntry } from "@/actionPanel/protocol";
import GridLoader from "react-spinners/GridLoader";
import blockRegistry from "@/blocks/registry";
import { useAsyncState } from "@/hooks/common";
import ConsoleLogger from "@/tests/ConsoleLogger";
import { getErrorMessage } from "@/extensionPoints/helpers";

// @ts-ignore: no @types/react-shadow-root
import ReactShadowRoot from "react-shadow-root";

// import the built-in bricks
import "@/blocks";
import "@/contrib";

const BodyComponent: React.FunctionComponent<{
  body: string | ComponentRef;
}> = ({ body }) => {
  return useMemo(() => {
    if (typeof body === "string") {
      return <div dangerouslySetInnerHTML={{ __html: body }} />;
    } else {
      const { Component, props } = body;
      return <Component {...props} />;
    }
  }, [body]);
};

const PanelBody: React.FunctionComponent<{ panel: PanelEntry }> = ({
  panel,
}) => {
  const [component, pending, error] = useAsyncState(async () => {
    if (!panel.payload) {
      return null;
    } else if ("error" in panel.payload) {
      const { error } = panel.payload;
      return <div className="text-danger">Error running panel: {error}</div>;
    } else {
      const { blockId, ctxt, args } = panel.payload;
      console.debug("Render panel body", panel.payload);
      const block = await blockRegistry.lookup(blockId);
      const body = await block.run(args, {
        ctxt,
        root: null,
        logger: new ConsoleLogger(),
      });
      return (
        <div>
          <ReactShadowRoot>
            <BodyComponent body={body as string | ComponentRef} />
          </ReactShadowRoot>
        </div>
      );
    }
  }, [panel.payload?.key]);

  if (error) {
    return (
      <div className="text-danger">
        Error rendering panel: {getErrorMessage(error as Error)}
      </div>
    );
  } else if (pending || component == null) {
    return <GridLoader />;
  } else {
    return component;
  }
};

export default PanelBody;
