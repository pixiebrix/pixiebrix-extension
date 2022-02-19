/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import Loader from "@/components/Loader";
import blockRegistry from "@/blocks/registry";
import { useAsyncState } from "@/hooks/common";
import ConsoleLogger from "@/tests/ConsoleLogger";
import ReactShadowRoot from "react-shadow-root";
import { getErrorMessage } from "@/errors";
import { BlockArg, RendererOutput } from "@/core";
import { PanelPayload } from "@/sidebar/types";
import RendererComponent from "@/sidebar/RendererComponent";

const PanelBody: React.FunctionComponent<{ payload: PanelPayload }> = ({
  payload,
}) => {
  const [component, pending, error] = useAsyncState(async () => {
    if (!payload) {
      return null;
    }

    if ("error" in payload) {
      // Have useAsyncState return the error. PanelBody already knows how to render an error received from useAsyncState
      const { error } = payload;
      throw error;
    }

    // FIXME: https://github.com/pixiebrix/pixiebrix-extension/issues/1939
    const { blockId, ctxt, args } = payload;
    const block = await blockRegistry.lookup(blockId);
    const body = await block.run(args as BlockArg, {
      ctxt,
      root: null,
      // TODO: use the correct logger here so the errors show up in the logs
      logger: new ConsoleLogger({ blockId }),
    });
    return (
      <div className="full-height" data-block-id={blockId}>
        <ReactShadowRoot>
          <RendererComponent body={body as RendererOutput} />
        </ReactShadowRoot>
      </div>
    );
  }, [payload?.key]);

  if (error) {
    return (
      <div className="text-danger">
        Error rendering panel: {getErrorMessage(error as Error)}
      </div>
    );
  }

  if (pending || component == null) {
    return <Loader />;
  }

  return component;
};

export default PanelBody;
