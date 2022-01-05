/* eslint-disable complexity */
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

import React, { useContext, useMemo } from "react";
import { UUID } from "@/core";
import { isEmpty, isEqual, pickBy, startsWith } from "lodash";
import { useFormikContext } from "formik";
import formBuilderSelectors from "@/devTools/editor/slices/formBuilderSelectors";
import { actions } from "@/devTools/editor/slices/formBuilderSlice";
import { Alert, Button, Nav, Tab } from "react-bootstrap";
import JsonTree from "@/components/jsonTree/JsonTree";
import styles from "./DataPanel.module.scss";
import FormPreview from "@/components/formBuilder/FormPreview";
import ErrorBoundary from "@/components/ErrorBoundary";
import BlockPreview, {
  usePreviewInfo,
} from "@/devTools/editor/tabs/effect/BlockPreview";
import useReduxState from "@/hooks/useReduxState";
import {
  faExclamationTriangle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import AuthContext from "@/auth/AuthContext";
import { useSelector } from "react-redux";
import { selectExtensionTrace } from "@/devTools/editor/slices/runtimeSelectors";
import { JsonObject } from "type-fest";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import DataTab from "./DataTab";
import useDataPanelActiveTabKey from "@/devTools/editor/tabs/editTab/dataPanel/useDataPanelActiveTabKey";
import useDataPanelTabSearchQuery from "@/devTools/editor/tabs/editTab/dataPanel/useDataPanelTabSearchQuery";
import DocumentPreview from "@/components/documentBuilder/preview/DocumentPreview";
import documentBuilderSelectors from "@/devTools/editor/slices/documentBuilderSelectors";
import { actions as documentBuilderActions } from "@/devTools/editor/slices/documentBuilderSlice";
import copy from "copy-to-clipboard";

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

const DataPanel: React.FC<{
  instanceId: UUID;
}> = ({ instanceId }) => {
  const { flags } = useContext(AuthContext);

  const showDeveloperTabs = flags.includes("page-editor-developer");

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

  const [formBuilderActiveField, setFormBuilderActiveField] = useReduxState(
    formBuilderSelectors.activeField,
    actions.setActiveField
  );

  const [
    documentBuilderActiveElement,
    setDocumentBuilderActiveElement,
  ] = useReduxState(
    documentBuilderSelectors.activeElement,
    documentBuilderActions.setActiveElement
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

  const [activeTabKey, onSelectTab] = useDataPanelActiveTabKey(
    showFormPreview || showDocumentPreview ? "preview" : "output"
  );

  const [contextQuery, setContextQuery] = useDataPanelTabSearchQuery("context");
  const [formikQuery, setFormikQuery] = useDataPanelTabSearchQuery("formik");
  const [renderedQuery, setRenderedQuery] = useDataPanelTabSearchQuery(
    "rendered"
  );
  const [outputQuery, setOutputQuery] = useDataPanelTabSearchQuery("output");

  const popupBoundary = showDocumentPreview
    ? document.querySelector(`.${styles.tabContent}`)
    : undefined;

  return (
    <Tab.Container activeKey={activeTabKey} onSelect={onSelectTab}>
      <div className={styles.tabContainer}>
        <Nav variant="tabs">
          <Nav.Item className={styles.tabNav}>
            <Nav.Link eventKey="context">Context</Nav.Link>
          </Nav.Item>
          {showDeveloperTabs && (
            <>
              <Nav.Item className={styles.tabNav}>
                <Nav.Link eventKey="formik">Formik</Nav.Link>
              </Nav.Item>
              <Nav.Item className={styles.tabNav}>
                <Nav.Link eventKey="blockConfig">Raw Block</Nav.Link>
              </Nav.Item>
            </>
          )}
          <Nav.Item className={styles.tabNav}>
            <Nav.Link eventKey="rendered">Rendered</Nav.Link>
          </Nav.Item>
          <Nav.Item className={styles.tabNav}>
            <Nav.Link eventKey="output">Output</Nav.Link>
          </Nav.Item>
          <Nav.Item className={styles.tabNav}>
            <Nav.Link eventKey="preview">Preview</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content className={styles.tabContent}>
          <DataTab eventKey="context" isTraceEmpty={!record}>
            {isInputStale && (
              <Alert variant="warning">
                <FontAwesomeIcon icon={faExclamationTriangle} /> A previous
                block has changed, input context may be out of date
              </Alert>
            )}
            <JsonTree
              data={relevantContext}
              copyable
              searchable
              initialSearchQuery={contextQuery}
              onSearchQueryChanged={setContextQuery}
              shouldExpandNode={(keyPath) =>
                keyPath.length === 1 && startsWith(keyPath[0].toString(), "@")
              }
            />
          </DataTab>
          {showDeveloperTabs && (
            <>
              <DataTab eventKey="formik">
                <div className="text-info">
                  <FontAwesomeIcon icon={faInfoCircle} /> This tab is only
                  visible to developers
                </div>
                <JsonTree
                  data={formikData ?? {}}
                  searchable
                  initialSearchQuery={formikQuery}
                  onSearchQueryChanged={setFormikQuery}
                />
              </DataTab>
              <DataTab eventKey="blockConfig">
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
          <DataTab eventKey="rendered" isTraceEmpty={!record}>
            {record && (
              <>
                {isInputStale && (
                  <Alert variant="warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> A previous
                    block has changed, input context may be out of date
                  </Alert>
                )}
                <JsonTree
                  data={record.renderedArgs}
                  copyable
                  searchable
                  initialSearchQuery={renderedQuery}
                  onSearchQueryChanged={setRenderedQuery}
                  label="Rendered Inputs"
                />
              </>
            )}
          </DataTab>
          <DataTab
            eventKey="output"
            isTraceEmpty={!record}
            isTraceOptional={previewInfo?.traceOptional}
          >
            {outputObj && (
              <>
                {isCurrentStale && (
                  <Alert variant="warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> This or a
                    previous block has changed, output may be out of date
                  </Alert>
                )}
                <JsonTree
                  data={outputObj}
                  copyable
                  searchable
                  initialSearchQuery={outputQuery}
                  onSearchQueryChanged={setOutputQuery}
                  label="Data"
                  shouldExpandNode={(keyPath) =>
                    keyPath.length === 1 &&
                    "outputKey" in record &&
                    keyPath[0] === `@${record.outputKey}`
                  }
                />
              </>
            )}
            {record && "error" in record && (
              <JsonTree data={record.error} label="Error" />
            )}
          </DataTab>
          <DataTab
            eventKey="preview"
            isTraceEmpty={false}
            // Only mount if the user is viewing it, because output previews take up resources to run
            mountOnEnter
            unmountOnExit
          >
            {showFormPreview || showDocumentPreview ? (
              <ErrorBoundary>
                {showFormPreview ? (
                  <div className={styles.selectablePreviewContainer}>
                    <FormPreview
                      rjsfSchema={block.config as RJSFSchema}
                      activeField={formBuilderActiveField}
                      setActiveField={setFormBuilderActiveField}
                    />
                  </div>
                ) : (
                  <DocumentPreview
                    name={documentBodyName}
                    activeElement={documentBuilderActiveElement}
                    setActiveElement={setDocumentBuilderActiveElement}
                    menuBoundary={popupBoundary}
                  />
                )}
              </ErrorBoundary>
            ) : showBlockPreview ? (
              <ErrorBoundary>
                <BlockPreview traceRecord={record} blockConfig={block} />
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
