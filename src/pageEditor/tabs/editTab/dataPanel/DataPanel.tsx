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
import { UUID } from "@/core";
import { RootState, FormState } from "@/pageEditor/pageEditorTypes";
import { isEmpty, isEqual, pickBy } from "lodash";
import { useFormikContext } from "formik";
import { Alert, Button, Nav, Tab } from "react-bootstrap";
import JsonTree from "@/components/jsonTree/JsonTree";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import ErrorBoundary from "@/components/ErrorBoundary";
import BlockPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BlockPreview";
import useReduxState from "@/hooks/useReduxState";
import {
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { JsonObject } from "type-fest";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DataTab from "./DataTab";
import useDataPanelActiveTabKey from "@/pageEditor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import DocumentPreview from "@/components/documentBuilder/preview/DocumentPreview";
import copy from "copy-to-clipboard";
import useFlags from "@/hooks/useFlags";
import ErrorDisplay from "./ErrorDisplay";
import PageStateTab from "./PageStateTab";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import { selectNodePreviewActiveElement } from "@/pageEditor/uiState/uiState";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";

// TODO
// - Update the usage of JsonTree for DataTabJsonTree in other components
// - Fix the rendering error: Cannot update a component (`SidebarExpanded`) while rendering a different component (`JSONNestedNode`).

// TODO Tests
// - Test the active element of Document builder (select, switch node, get back, assert)
// - Test the active element of Form builder (select, switch node, get back, assert)
// - Test the active element on node order change (select element, move element up, assert)

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

const DataPanel: React.FC<{
  instanceId: UUID;
}> = ({ instanceId }) => {
  const { flagOn } = useFlags();
  const showDeveloperTabs = flagOn("page-editor-developer");

  const { values: formState, errors } = useFormikContext<FormState>();
  const formikData = { errors, ...formState };

  const { blockPipeline } = formState.extension;
  const blockIndex = blockPipeline.findIndex(
    (x) => x.instanceId === instanceId
  );
  // eslint-disable-next-line security/detect-object-injection
  const block = blockPipeline[blockIndex];

  const traces = useSelector(selectExtensionTrace);
  const record = traces.find((trace) => trace.blockInstanceId === instanceId);

  const isInputStale = useMemo(() => {
    // Don't show the warning if there are no traces. Also, this block can't have a
    // stale input if it's the first block in the pipeline.
    if (record === undefined || blockIndex === 0) {
      return false;
    }

    const currentInput = blockPipeline.slice(0, blockIndex);
    const tracedInput = currentInput.map(
      (block) =>
        traces.find((trace) => trace.blockInstanceId === block.instanceId)
          ?.blockConfig
    );

    return !isEqual(currentInput, tracedInput);
  }, [blockIndex, blockPipeline, record, traces]);

  const isCurrentStale = useMemo(() => {
    if (isInputStale) {
      return true;
    }

    if (record === undefined) {
      return false;
    }

    return !isEqual(record.blockConfig, block);
  }, [isInputStale, record, block]);

  const relevantContext = useMemo(
    () => pickBy(record?.templateContext ?? {}, contextFilter),
    [record?.templateContext]
  );

  const documentBodyName = `extension.blockPipeline.${blockIndex}.config.body`;

  const outputObj: JsonObject =
    record !== undefined && "output" in record
      ? "outputKey" in record
        ? { [`@${record.outputKey}`]: record.output }
        : record.output
      : null;

  const [previewInfo] = usePreviewInfo(block?.id);

  const showFormPreview = block.config?.schema && block.config?.uiSchema;
  const showDocumentPreview = block.config?.body;
  const showBlockPreview = record || previewInfo?.traceOptional;
  const showPageState = pageStateBlockIds.includes(block.id);

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    showFormPreview || showDocumentPreview
      ? DataPanelTabKey.Preview
      : DataPanelTabKey.Output
  );

  const [activeElement, setActiveElement] = useReduxState(
    selectNodePreviewActiveElement,
    editorActions.setNodePreviewActiveElement
  );

  const popupBoundary = showDocumentPreview
    ? document.querySelector(`.${dataPanelStyles.tabContent}`)
    : undefined;

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
        </Nav>
        <Tab.Content className={dataPanelStyles.tabContent}>
          <DataTab eventKey={DataPanelTabKey.Context} isTraceEmpty={!record}>
            {isInputStale && (
              <Alert variant="warning">
                <FontAwesomeIcon icon={faExclamationTriangle} /> A previous
                block has changed, input context may be out of date
              </Alert>
            )}
            <DataTabJsonTree
              data={relevantContext}
              copyable
              searchable
              tabKey={DataPanelTabKey.Context}
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
                  data={formikData ?? {}}
                  searchable
                  tabKey={DataPanelTabKey.Formik}
                />
              </DataTab>
              <DataTab eventKey={DataPanelTabKey.BlockConfig}>
                <div className="text-info">
                  <FontAwesomeIcon icon={faInfoCircle} /> This tab is only
                  visible to developers
                </div>
                <JsonTree data={block ?? {}} />
                <Button
                  onClick={() => {
                    copy(JSON.stringify(block, undefined, 2));
                  }}
                  size="sm"
                >
                  Copy JSON
                </Button>
              </DataTab>
            </>
          )}
          <DataTab eventKey={DataPanelTabKey.Rendered} isTraceEmpty={!record}>
            {record?.renderError ? (
              <>
                {record.skippedRun ? (
                  <Alert variant="info">
                    <FontAwesomeIcon icon={faInfoCircle} /> Error rendering
                    input arguments, but brick was skipped because condition was
                    not met
                  </Alert>
                ) : (
                  <Alert variant="danger">
                    <FontAwesomeIcon icon={faExclamationCircle} /> Error
                    rendering input arguments
                  </Alert>
                )}
                <ErrorDisplay error={record.renderError} />
              </>
            ) : (
              <>
                {isInputStale && (
                  <Alert variant="warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> A previous
                    block has changed, input context may be out of date
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
                <FontAwesomeIcon icon={faInfoCircle} /> The brick did not run
                because the condition was not met
              </Alert>
            )}
            {!record?.skippedRun && outputObj && (
              <>
                {isCurrentStale && (
                  <Alert variant="warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> This or a
                    previous brick has changed, output may be out of date
                  </Alert>
                )}
                <DataTabJsonTree
                  data={outputObj}
                  copyable
                  searchable
                  tabKey={DataPanelTabKey.Output}
                  label="Data"
                />
              </>
            )}
            {record && "error" in record && (
              <ErrorDisplay error={record.error} />
            )}
          </DataTab>
          <DataTab
            eventKey={DataPanelTabKey.Preview}
            isTraceEmpty={false}
            // Only mount if the user is viewing it, because output previews take up resources to run
            mountOnEnter
            unmountOnExit
          >
            {/* The value of block.if can be `false`, in this case we also need to show the warning */}
            {block.if != null && (
              <Alert variant="info">
                <FontAwesomeIcon icon={faInfoCircle} /> This brick has a
                condition. The brick will not execute if the condition is not
                met
              </Alert>
            )}
            {showFormPreview || showDocumentPreview ? (
              <ErrorBoundary>
                {showFormPreview ? (
                  <div className={dataPanelStyles.selectablePreviewContainer}>
                    <FormPreview
                      rjsfSchema={block.config as RJSFSchema}
                      activeField={activeElement}
                      setActiveField={setActiveElement}
                    />
                  </div>
                ) : (
                  <DocumentPreview
                    name={documentBodyName}
                    activeElement={activeElement}
                    setActiveElement={setActiveElement}
                    menuBoundary={popupBoundary}
                  />
                )}
              </ErrorBoundary>
            ) : showBlockPreview ? (
              <ErrorBoundary>
                <BlockPreview
                  traceRecord={record}
                  blockConfig={block}
                  extensionPoint={formState.extensionPoint}
                />
              </ErrorBoundary>
            ) : (
              <div className="text-muted">
                Run the extension once to enable live preview
              </div>
            )}
          </DataTab>
        </Tab.Content>
      </div>
    </Tab.Container>
  );
};

export default DataPanel;
