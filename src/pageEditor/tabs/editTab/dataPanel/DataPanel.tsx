/* eslint-disable complexity */
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

import React, { useMemo } from "react";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { isEmpty, isEqual, pickBy } from "lodash";
import { useFormikContext } from "formik";
import { Nav, Tab } from "react-bootstrap";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import ErrorBoundary from "@/components/ErrorBoundary";
import BlockPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BlockPreview";
import useReduxState from "@/hooks/useReduxState";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { JsonObject } from "type-fest";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DataTab from "./DataTab";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import DocumentPreview from "@/components/documentBuilder/preview/DocumentPreview";
import useFlags from "@/hooks/useFlags";
import ErrorDisplay from "./ErrorDisplay";
import PageStateTab from "./PageStateTab";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import {
  selectActiveElement,
  selectActiveNodeId,
  selectActiveNodeInfo,
  selectNodePreviewActiveElement,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import Alert from "@/components/Alert";
import { CustomFormRenderer } from "@/blocks/renderers/customForm";
import { FormTransformer } from "@/blocks/transformers/ephemeralForm/formTransformer";
import { DocumentRenderer } from "@/blocks/renderers/document";
import DocumentOutline from "@/components/documentBuilder/outline/DocumentOutline";
import useAllBlocks from "@/pageEditor/hooks/useAllBlocks";

/**
 * Exclude irrelevant top-level keys.
 */
const contextFilter = (value: unknown, key: string) => {
  // `@options` comes from marketplace-installed extensions. There's a chance the user might add a brick that has
  // @options as an output key. In that case, we'd expect values to flow into it. So just checking to see if there's
  // any data is a good compromise even though we miss the corner-case where @options is user-defined but empty
  if (key === "@options" && isEmpty(value)) {
    return false;
  }

  // At one point, we also excluded keys that weren't prefixed with "@" as a stop-gap for encouraging the use of output
  // keys. With the introduction of ApiVersion v2, we removed that filter
  return true;
};

const pageStateBlockIds = ["@pixiebrix/state/set", "@pixiebrix/state/get"];

const DataPanel: React.FC = () => {
  const activeNodeId = useSelector(selectActiveNodeId);
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const { errors: formikErrors } = useFormikContext<FormState>();
  const activeElement = useSelector(selectActiveElement);

  const {
    blockId,
    blockConfig,
    index: blockIndex,
    pipeline,
  } = useSelector(selectActiveNodeInfo);

  const [allBlocks] = useAllBlocks();
  const blockType = allBlocks.get(blockId)?.type;

  const traces = useSelector(selectExtensionTrace);
  const record = traces.find((trace) => trace.blockInstanceId === activeNodeId);

  const isInputStale = useMemo(() => {
    // Don't show the warning if there are no traces. Also, this block can't have a
    // stale input if it's the first block in the pipeline.
    if (record === undefined || blockIndex === 0) {
      return false;
    }

    const currentInput = pipeline.slice(0, blockIndex);
    const tracedInput = currentInput.map(
      (block) =>
        traces.find((trace) => trace.blockInstanceId === block.instanceId)
          ?.blockConfig
    );

    return !isEqual(currentInput, tracedInput);
  }, [blockIndex, pipeline, record, traces]);

  const isCurrentStale = useMemo(() => {
    if (isInputStale) {
      return true;
    }

    if (record === undefined) {
      return false;
    }

    return !isEqual(record.blockConfig, blockConfig);
  }, [isInputStale, record, blockConfig]);

  const relevantContext = useMemo(
    () => pickBy(record?.templateContext ?? {}, contextFilter),
    [record?.templateContext]
  );

  // TODO refactor this to work with nested pipelines
  const documentBodyName = `extension.blockPipeline.${blockIndex}.config.body`;

  const outputObj: JsonObject =
    record !== undefined && "output" in record
      ? "outputKey" in record
        ? { [`@${record.outputKey}`]: record.output }
        : record.output
      : null;

  const [previewInfo] = usePreviewInfo(blockId);

  const showFormPreview =
    blockId === CustomFormRenderer.BLOCK_ID ||
    blockId === FormTransformer.BLOCK_ID;
  const showDocumentPreview = blockId === DocumentRenderer.BLOCK_ID;
  const showBlockPreview = record || previewInfo?.traceOptional;
  const showPageState = pageStateBlockIds.includes(blockId);

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    showFormPreview || showDocumentPreview
      ? DataPanelTabKey.Preview
      : DataPanelTabKey.Output
  );

  const [nodePreviewActiveElement, setNodePreviewActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  const popupBoundary = showDocumentPreview
    ? document.querySelector(`.${dataPanelStyles.tabContent}`)
    : undefined;

  const isRenderedPanelStale = useMemo(() => {
    // Only show alert for Panel and Side Panel extensions
    if (
      activeElement.type !== "panel" &&
      activeElement.type !== "actionPanel"
    ) {
      return false;
    }

    const trace = traces.find(
      (trace) => trace.blockInstanceId === activeNodeId
    );

    // No traces or no changes since the last render, we are good, no alert
    if (
      traces.length === 0 ||
      trace == null ||
      isEqual(trace.blockConfig, blockConfig)
    ) {
      return false;
    }

    return true;
  }, [activeNodeId, activeElement, traces, blockConfig]);

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <div className={dataPanelStyles.tabContainer}>
        <Nav variant="tabs">
          <Nav.Item className={dataPanelStyles.tabNav}>
            <Nav.Link eventKey={DataPanelTabKey.Context}>Context</Nav.Link>
          </Nav.Item>
          {showPageState && (
            <Nav.Item className={dataPanelStyles.tabNav}>
              <Nav.Link eventKey={DataPanelTabKey.PageState}>
                Page State
              </Nav.Link>
            </Nav.Item>
          )}
          {showDeveloperTabs && (
            <>
              <Nav.Item className={dataPanelStyles.tabNav}>
                <Nav.Link eventKey={DataPanelTabKey.Formik}>Formik</Nav.Link>
              </Nav.Item>
              <Nav.Item className={dataPanelStyles.tabNav}>
                <Nav.Link eventKey={DataPanelTabKey.BlockConfig}>
                  Raw Block
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
        </Nav>
        <Tab.Content className={dataPanelStyles.tabContent}>
          <DataTab eventKey={DataPanelTabKey.Context} isTraceEmpty={!record}>
            {isInputStale && (
              <Alert variant="warning">
                A previous block has changed, input context may be out of date
              </Alert>
            )}
            <DataTabJsonTree
              data={relevantContext}
              copyable
              searchable
              tabKey={DataPanelTabKey.Context}
              label="Context"
            />
          </DataTab>
          {showPageState && (
            <DataTab eventKey={DataPanelTabKey.PageState}>
              <PageStateTab />
            </DataTab>
          )}
          {showDeveloperTabs && (
            <>
              <DataTab eventKey={DataPanelTabKey.Formik}>
                <div className="text-info">
                  <FontAwesomeIcon icon={faInfoCircle} /> This tab is only
                  visible to developers
                </div>
                <DataTabJsonTree
                  data={{ ...activeElement, ...formikErrors }}
                  searchable
                  tabKey={DataPanelTabKey.Formik}
                  label="Formik State"
                />
              </DataTab>
              <DataTab eventKey={DataPanelTabKey.BlockConfig}>
                <div className="text-info">
                  <FontAwesomeIcon icon={faInfoCircle} /> This tab is only
                  visible to developers
                </div>
                <DataTabJsonTree
                  data={blockConfig ?? {}}
                  tabKey={DataPanelTabKey.BlockConfig}
                  label="Configuration"
                />
              </DataTab>
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
                    A previous block has changed, input context may be out of
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
              blockType === "renderer" && (
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
            {record && "error" in record && record.error != null && (
              <ErrorDisplay error={record.error} />
            )}
          </DataTab>
          <DataTab eventKey={DataPanelTabKey.Preview} isTraceEmpty={false}>
            {/* The value of block.if can be `false`, in this case we also need to show the warning */}
            {blockConfig?.if != null && (
              <Alert variant="info">
                This brick has a condition. The brick will not execute if the
                condition is not met
              </Alert>
            )}
            {showFormPreview || showDocumentPreview ? (
              <ErrorBoundary>
                {isRenderedPanelStale && (
                  <Alert variant="info">
                    The rendered{" "}
                    {activeElement.type === "panel" ? "Panel" : "Sidebar Panel"}{" "}
                    is out of date with the preview
                  </Alert>
                )}
                {showFormPreview ? (
                  <div className={dataPanelStyles.selectablePreviewContainer}>
                    <FormPreview
                      rjsfSchema={blockConfig?.config as RJSFSchema}
                      activeField={nodePreviewActiveElement}
                      setActiveField={setNodePreviewActiveElement}
                    />
                  </div>
                ) : (
                  <DocumentPreview
                    documentBodyName={documentBodyName}
                    activeElement={nodePreviewActiveElement}
                    setActiveElement={setNodePreviewActiveElement}
                    menuBoundary={popupBoundary}
                  />
                )}
              </ErrorBoundary>
            ) : showBlockPreview ? (
              <ErrorBoundary>
                <BlockPreview
                  traceRecord={record}
                  blockConfig={blockConfig}
                  extensionPoint={activeElement.extensionPoint}
                />
              </ErrorBoundary>
            ) : (
              <div className="text-muted">
                Run the extension once to enable live preview
              </div>
            )}
          </DataTab>

          <DataTab eventKey={DataPanelTabKey.Outline} isTraceEmpty={false}>
            <ErrorBoundary>
              {isRenderedPanelStale && (
                <Alert variant="info">
                  The rendered{" "}
                  {activeElement.type === "panel" ? "Panel" : "Sidebar Panel"}{" "}
                  is out of date with the outline
                </Alert>
              )}
              <DocumentOutline
                documentBodyName={documentBodyName}
                activeElement={nodePreviewActiveElement}
                setActiveElement={setNodePreviewActiveElement}
              />
            </ErrorBoundary>
          </DataTab>
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default DataPanel;
