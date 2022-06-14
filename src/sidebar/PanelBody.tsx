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

import React, { useReducer } from "react";
import Loader from "@/components/Loader";
import blockRegistry from "@/blocks/registry";
import ReactShadowRoot from "react-shadow-root";
import { getErrorMessage, selectSpecificError } from "@/errors/errorHelpers";
import { BlockArg, MessageContext, RegistryId, RendererOutput } from "@/core";
import { PanelPayload, PanelRunMeta } from "@/sidebar/types";
import RendererComponent from "@/sidebar/RendererComponent";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { useAsyncEffect } from "use-async-effect";
import GridLoader from "react-spinners/GridLoader";
import styles from "./PanelBody.module.scss";
import RootCancelledPanel from "@/sidebar/components/RootCancelledPanel";
import RootErrorPanel from "@/sidebar/components/RootErrorPanel";
import BackgroundLogger from "@/telemetry/BackgroundLogger";

type BodyProps = {
  blockId: RegistryId;
  body: RendererOutput;
  meta: PanelRunMeta;
};

const BodyContainer: React.FC<BodyProps & { isFetching: boolean }> = ({
  blockId,
  body,
  isFetching,
  meta,
}) => (
  <>
    {isFetching && (
      <span className={styles.loader}>
        <GridLoader size={8} />
      </span>
    )}

    <div className="full-height" data-block-id={blockId}>
      <ReactShadowRoot>
        <RendererComponent body={body} meta={meta} />
      </ReactShadowRoot>
    </div>
  </>
);

type State = {
  /**
   * Data about the component to display
   */
  component: BodyProps | null;
  /**
   * True if the panel is loading the first time
   */
  isLoading: boolean;
  /**
   * True if the panel is recalculating
   */
  isFetching: boolean;
  /**
   * Error to display from running the renderer
   */
  error: unknown | null;
};

const initialPanelState: State = {
  component: null,
  isLoading: true,
  isFetching: true,
  error: null,
};

const slice = createSlice({
  name: "panelSlice",
  initialState: initialPanelState,
  reducers: {
    reactivate(state) {
      // Don't clear out the component/error, because we want to keep showing the old component while the panel is
      // reloading
      state.isFetching = true;
    },
    success(state, action: PayloadAction<{ data: BodyProps }>) {
      state.isLoading = false;
      state.isFetching = false;
      state.component = action.payload.data;
      state.error = null;
    },
    failure(state, action: PayloadAction<{ error: unknown }>) {
      state.isLoading = false;
      state.isFetching = false;
      state.component = null;
      state.error = action.payload.error ?? "Error rendering component";
    },
  },
});

const PanelBody: React.FunctionComponent<{
  isRootPanel?: boolean;
  payload: PanelPayload;
  context: MessageContext;
}> = ({ payload, context, isRootPanel = false }) => {
  const [state, dispatch] = useReducer(slice.reducer, initialPanelState);

  useAsyncEffect(async () => {
    if (payload == null) {
      dispatch(slice.actions.reactivate());
      return;
    }

    if ("error" in payload) {
      dispatch(slice.actions.failure({ error: payload.error }));
      return;
    }

    try {
      // In most cases reactivate would have already been called for the payload == null branch. But confirm it here
      dispatch(slice.actions.reactivate());

      const { blockId, ctxt, args, runId, extensionId } = payload;

      console.debug("Running panel body for panel payload", payload);

      const block = await blockRegistry.lookup(blockId);
      // In the future, the renderer brick should run in the contentScript, not the panel frame
      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/1939
      const body = await block.run(args as BlockArg, {
        ctxt,
        root: null,
        logger: new BackgroundLogger({
          ...context,
          blockId,
        }),
        async runPipeline() {
          throw new BusinessError(
            "Support for running pipelines in panels not implemented"
          );
        },
      });

      if (!runId || !extensionId) {
        console.warn("PanelBody requires runId in RendererPayload", {
          payload,
        });
      }

      dispatch(
        slice.actions.success({
          data: {
            blockId,
            body: body as RendererOutput,
            meta: { runId, extensionId },
          },
        })
      );
    } catch (error) {
      dispatch(slice.actions.failure({ error }));
    }
  }, [payload?.key, dispatch]);

  // Only show loader on initial render. Otherwise, just overlay a loading indicator over the other panel to
  // avoid remounting the whole generated component. Some components maybe have long initialization times. E.g., our
  // Document Builder loads Bootstrap into the Shadow DOM
  if (state.isLoading) {
    return <Loader />;
  }

  if (state.error) {
    const cancelError = selectSpecificError(state.error, CancelError);

    if (cancelError) {
      return (
        <>
          {state.isFetching && (
            <span className={styles.loader}>
              <GridLoader size={8} />
            </span>
          )}
          {isRootPanel ? (
            <RootCancelledPanel error={cancelError} />
          ) : (
            <div className="text-muted">
              This panel is not available: {getErrorMessage(state.error)}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        {state.isFetching && (
          <span className={styles.loader}>
            <GridLoader size={8} />
          </span>
        )}
        {isRootPanel ? (
          <RootErrorPanel error={state.error} />
        ) : (
          <div className="text-danger">
            Error rendering panel: {getErrorMessage(state.error)}
          </div>
        )}
      </>
    );
  }

  return <BodyContainer {...state.component} isFetching={state.isFetching} />;
};

export default PanelBody;
