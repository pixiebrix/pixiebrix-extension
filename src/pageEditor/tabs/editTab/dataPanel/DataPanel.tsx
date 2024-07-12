/* eslint-disable complexity -- necessary complexity due to data handling  */
/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useEffect, useMemo } from "react";
import { isEmpty, isEqual, pickBy, omit } from "lodash";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrickPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BrickPreview";
import useReduxState from "@/hooks/useReduxState";
import { useSelector } from "react-redux";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { type JsonObject } from "type-fest";
import { type RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DataTab from "./DataTab";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import DocumentPreview from "@/pageEditor/documentBuilder/preview/DocumentPreview";
import useFlags from "@/hooks/useFlags";
import ErrorDisplay from "./ErrorDisplay";
import ModVariablesTab from "./tabs/ModVariablesTab";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import {
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectActiveNodeInfo,
  selectActiveBuilderPreviewElement,
} from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import Alert from "@/components/Alert";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { DocumentRenderer } from "@/bricks/renderers/document";
import DocumentOutline from "@/pageEditor/documentBuilder/outline/DocumentOutline";
import useAllBricks from "@/bricks/hooks/useAllBricks";
import ModComponentFormStateTab from "./tabs/ModComponentFormStateTab";
import BrickConfigFormStateTab from "./tabs/BrickConfigFormStateTab";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import { joinPathParts } from "@/utils/formUtils";
import CommentsTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/CommentsTab";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { BrickTypes } from "@/runtime/runtimeTypes";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

/**
 * Exclude irrelevant top-level keys.
 */
const contextFilter = (value: unknown, key: string) => {
  // `@options` comes from marketplace-activated mod components. There's a chance the user might add a brick that has
  // @options as an output key. In that case, we'd expect values to flow into it. So just checking to see if there's
  // any data is a good compromise even though we miss the corner-case where @options is user-defined but empty
  if (key === "@options" && isEmpty(value)) {
    return false;
  }

  // At one point, we also excluded keys that weren't prefixed with "@" as a stop-gap for encouraging the use of output
  // keys. With the introduction of ApiVersion v2, we removed that filter
  return true;
};

const DataPanel: React.FC = () => {
  const activeNodeId = useSelector(selectActiveNodeId);
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  const {
    blockId: brickId,
    blockConfig: brickConfig,
    index: brickIndex,
    path: brickPath,
    pipeline,
  } = useSelector(selectActiveNodeInfo);

  const { allBricks } = useAllBricks();
  const brick = allBricks.get(brickId);
  const brickType = brick?.type;

  const traces = useSelector(selectActiveModComponentTraces);
  const record = traces.find((trace) => trace.brickInstanceId === activeNodeId);

  const isInputStale = useMemo(() => {
    // Don't show the warning if there are no traces. Also, this brick can't have a
    // stale input if it's the first brick in the pipeline.
    if (record === undefined || brickIndex === 0) {
      return false;
    }

    const currentInput = pipeline.slice(0, brickIndex);
    const tracedInput = currentInput.map(
      (brick) =>
        traces.find((trace) => trace.brickInstanceId === brick.instanceId)
          ?.brickConfig,
    );

    return !isEqual(currentInput, tracedInput);
  }, [brickIndex, pipeline, record, traces]);

  const isCurrentStale = useMemo(() => {
    if (isInputStale) {
      return true;
    }

    if (record === undefined) {
      return false;
    }

    return !isEqual(record.brickConfig, brickConfig);
  }, [isInputStale, record, brickConfig]);

  const relevantContext = useMemo(
    () => pickBy(record?.templateContext ?? {}, contextFilter),
    [record?.templateContext],
  );

  const documentBodyFieldName = joinPathParts(brickPath, "config.body");
  const brickCommentsFieldName = joinPathParts(brickPath, "comments");

  const outputObj: JsonObject =
    record !== undefined && "output" in record
      ? "outputKey" in record
        ? { [`@${record.outputKey}`]: record.output }
        : record.output
      : null;

  const { data: previewInfo } = usePreviewInfo(brickId);

  const showFormPreview =
    brickId === CustomFormRenderer.BRICK_ID ||
    brickId === FormTransformer.BRICK_ID;
  const showDocumentPreview = brickId === DocumentRenderer.BRICK_ID;
  const showBrickPreview = record || previewInfo?.traceOptional;

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    showFormPreview || showDocumentPreview
      ? DataPanelTabKey.Preview
      : DataPanelTabKey.Output,
  );

  useEffect(() => {
    reportEvent(Events.DATA_PANEL_TAB_VIEW, {
      modId: activeModComponentFormState.modMetadata?.id,
      brickId,
      tabName: activeTabKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to report when `activeTabKey` changes
  }, [activeTabKey]);

  const [activeBuilderPreviewElement, setActiveBuilderPreviewElement] =
    useReduxState(
      selectActiveBuilderPreviewElement,
      editorActions.setActiveBuilderPreviewElement,
    );

  const popupBoundary = showDocumentPreview
    ? document.querySelector(`.${dataPanelStyles.tabContent}`)
    : undefined;

  const isRenderedPanelStale = useMemo(() => {
    // Only show alert for Panel and Side Panel mod components
    if (
      activeModComponentFormState.starterBrick.definition.type !==
      StarterBrickTypes.SIDEBAR_PANEL
    ) {
      return false;
    }

    const trace = traces.find(
      (trace) => trace.brickInstanceId === activeNodeId,
    );

    // No traces or no changes since the last render, we are good, no alert
    if (
      traces.length === 0 ||
      trace == null ||
      isEqual(
        omit(trace.brickConfig, ["comments"]),
        omit(brickConfig, ["comments"]),
      )
    ) {
      return false;
    }

    return true;
  }, [activeNodeId, activeModComponentFormState, traces, brickConfig]);

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <div>
        <Nav variant="tabs">
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Context}>Context</Nav.Link>
          </Nav.Item>
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.ModVariables}>
              Mod Variables
            </Nav.Link>
          </Nav.Item>
          {showDeveloperTabs && (
            <>
              <Nav.Item className={dataPanelStyles.tabNav}>
                <Nav.Link eventKey={DataPanelTabKey.ModComponentFormState}>
                  Mod Component State
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className={dataPanelStyles.tabNav}>
                <Nav.Link eventKey={DataPanelTabKey.BrickConfigFormState}>
                  Brick Config State
                </Nav.Link>
              </Nav.Item>
            </>
          )}
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Rendered}>Rendered</Nav.Link>
          </Nav.Item>
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Output}>Output</Nav.Link>
          </Nav.Item>
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Preview}>Preview</Nav.Link>
          </Nav.Item>
          {showDocumentPreview && (
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.Outline}>Outline</Nav.Link>
            </Nav.Item>
          )}
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Comments}>Comments</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content className={dataPanelStyles.tabContent}>
          <DataTab eventKey={DataPanelTabKey.Context} isTraceEmpty={!record}>
            {isInputStale && (
              <Alert variant="warning">
                A previous brick has changed, input context may be out of date
              </Alert>
            )}
            <DataTabJsonTree
              data={contextAsPlainObject(relevantContext)}
              copyable
              searchable
              tabKey={DataPanelTabKey.Context}
              label="Context"
            />
          </DataTab>
          <ModVariablesTab />
          {showDeveloperTabs && (
            <>
              <ModComponentFormStateTab />
              <BrickConfigFormStateTab config={brickConfig} />
            </>
          )}
          <DataTab eventKey={DataPanelTabKey.Rendered} isTraceEmpty={!record}>
            {record?.renderError ? (
              <>
                {record.skippedRun ? (
                  <Alert variant="info">
                    Error rendering input arguments, but brick was skipped
                    because condition was not met
                  </Alert>
                ) : (
                  <Alert variant="danger">
                    Error rendering input arguments
                  </Alert>
                )}
                <ErrorDisplay error={record.renderError} />
              </>
            ) : (
              <>
                {isInputStale && (
                  <Alert variant="warning">
                    A previous brick has changed, input context may be out of
                    date
                  </Alert>
                )}
                <DataTabJsonTree
                  data={record?.renderedArgs}
                  copyable
                  searchable
                  tabKey={DataPanelTabKey.Rendered}
                  label="Rendered Inputs"
                />
              </>
            )}
          </DataTab>
          <DataTab
            eventKey={DataPanelTabKey.Output}
            isTraceEmpty={!record}
            isTraceOptional={previewInfo?.traceOptional}
          >
            {record?.skippedRun && (
              <Alert variant="info">
                The brick did not run because the condition was not met
              </Alert>
            )}
            {!record?.skippedRun &&
              outputObj == null &&
              brickType === BrickTypes.RENDERER && (
                <Alert variant="info">
                  Renderer brick output is not available in Data Panel
                </Alert>
              )}
            {!record?.skippedRun && outputObj && (
              <>
                {isCurrentStale && (
                  <Alert variant="warning">
                    This or a previous brick has changed, output may be out of
                    date
                  </Alert>
                )}
                <DataTabJsonTree
                  data={outputObj}
                  copyable
                  searchable
                  tabKey={DataPanelTabKey.Output}
                  label="Output Data"
                />
              </>
            )}
            {record && "error" in record && record.error && (
              <ErrorDisplay error={record.error} />
            )}
          </DataTab>
          <DataTab eventKey={DataPanelTabKey.Preview} isTraceEmpty={false}>
            {/* The value of `brick.if` can be `false`, in which case we also need to show a warning that brick execution is conditional. */}
            {brickConfig?.if && (
              <Alert variant="info">
                This brick has a condition. The brick will not execute if the
                condition is not met
              </Alert>
            )}
            {showFormPreview || showDocumentPreview ? (
              <ErrorBoundary>
                {isRenderedPanelStale && (
                  <Alert variant="info">
                    The rendered Sidebar Panel is out of date with the preview
                  </Alert>
                )}
                {showFormPreview ? (
                  <FormPreview
                    rjsfSchema={brickConfig?.config as RJSFSchema}
                    activeField={activeBuilderPreviewElement}
                    setActiveField={setActiveBuilderPreviewElement}
                  />
                ) : (
                  <DocumentPreview
                    documentBodyName={documentBodyFieldName}
                    activeElement={activeBuilderPreviewElement}
                    setActiveElement={setActiveBuilderPreviewElement}
                    menuBoundary={popupBoundary}
                  />
                )}
              </ErrorBoundary>
            ) : showBrickPreview ? (
              <ErrorBoundary>
                <BrickPreview
                  traceRecord={record}
                  brickConfig={brickConfig}
                  starterBrick={activeModComponentFormState.starterBrick}
                />
              </ErrorBoundary>
            ) : (
              <div className="text-muted">
                Run the mod once to enable live preview
              </div>
            )}
          </DataTab>

          <DataTab eventKey={DataPanelTabKey.Outline} isTraceEmpty={false}>
            <ErrorBoundary>
              {isRenderedPanelStale && (
                <Alert variant="info">
                  The rendered Sidebar Panel is out of date with the outline
                </Alert>
              )}
              <DocumentOutline
                documentBodyName={documentBodyFieldName}
                activeElement={activeBuilderPreviewElement}
                setActiveElement={setActiveBuilderPreviewElement}
              />
            </ErrorBoundary>
          </DataTab>
          <CommentsTab
            brickId={brickConfig.id}
            modId={activeModComponentFormState.modMetadata?.id}
            brickCommentsFieldName={brickCommentsFieldName}
          />
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default DataPanel;
