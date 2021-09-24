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
import useInterval from "@/hooks/useInterval";
import { isEmpty, pickBy, sortBy } from "lodash";
import { useAsyncState } from "@/hooks/common";
import { getByInstanceId } from "@/telemetry/trace";
import { useField, useFormikContext } from "formik";
import formBuilderSelectors from "@/devTools/editor/slices/formBuilderSelectors";
import { actions } from "@/devTools/editor/slices/formBuilderSlice";
import { Nav, Tab, TabPaneProps } from "react-bootstrap";
import JsonTree from "@/components/jsonTree/JsonTree";
import styles from "./DataPanel.module.scss";
import FormPreview from "@/components/formBuilder/FormPreview";
import ErrorBoundary from "@/components/ErrorBoundary";
import BlockPreview, {
  usePreviewInfo,
} from "@/devTools/editor/tabs/effect/BlockPreview";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import { BlockConfig } from "@/blocks/types";
import useReduxState from "@/hooks/useReduxState";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import AuthContext from "@/auth/AuthContext";

const TRACE_RELOAD_MILLIS = 250;

function useLatestTraceRecord(instanceId: UUID) {
  return useAsyncState(async () => {
    if (instanceId == null) {
      throw new Error("No instance id found");
    }

    const records = await getByInstanceId(instanceId);
    return sortBy(records, (x) => new Date(x.timestamp)).reverse()[0];
  }, [instanceId]);
}

const contextFilter = (value: unknown, key: string) => {
  if (!key.startsWith("@")) {
    return false;
  }

  // `@options` comes from marketplace-installed extensions. There's a chance the user might add a brick that has
  // @options as an output key. In that case, we'd expect values to flow into it. So just checking to see if there's
  // any data is a good compromise even though we miss the corner-case where @options is user-defined but empty
  if (key === "@options" && isEmpty(value)) {
    return false;
  }

  return true;
};

type TabStateProps = {
  isLoading?: boolean;
  isTraceEmpty?: boolean;
  isTraceOptional?: boolean;
  error?: unknown;
};

const DataTab: React.FC<TabPaneProps & TabStateProps> = ({
  isLoading = false,
  isTraceEmpty = false,
  isTraceOptional = false,
  error,
  children,
  ...tabProps
}) => {
  let contents;
  if (isLoading) {
    contents = (
      <div className={styles.loading}>
        <GridLoader />
      </div>
    );
  } else if (isTraceEmpty && isTraceOptional) {
    contents = (
      <>
        <div className="text-muted">
          No trace available, run the extension to generate data
        </div>

        <div className="text-info mt-2">
          <FontAwesomeIcon icon={faInfoCircle} />
          &nbsp;This brick supports traceless output previews. See the Preview
          tab for the current preview
        </div>
      </>
    );
  } else if (isTraceEmpty) {
    contents = (
      <div className="text-muted">
        No trace available, run the extension to generate data
      </div>
    );
  } else if (error) {
    contents = (
      <div className="text-danger">
        Error loading trace: {getErrorMessage(error)}
      </div>
    );
  } else {
    contents = children;
  }

  return (
    <Tab.Pane {...tabProps} className="pt-3">
      {contents}
    </Tab.Pane>
  );
};

const DataPanel: React.FC<{
  blockFieldName: string;
  instanceId: UUID;
}> = ({ blockFieldName, instanceId }) => {
  const { flags } = useContext(AuthContext);

  const showDeveloperTabs = flags.includes("page-editor-developer");

  const { values: formState } = useFormikContext<FormState>();

  const [record, isLoading, error, recalculate] = useLatestTraceRecord(
    instanceId
  );

  useInterval(recalculate, TRACE_RELOAD_MILLIS);

  const relevantContext = useMemo(
    () => pickBy(record?.templateContext ?? {}, contextFilter),
    [record?.templateContext]
  );
  const blockFieldConfigName = `${blockFieldName}.config`;
  const [{ value: configValue }] = useField(blockFieldConfigName);
  const [formBuilderActiveField, setFormBuilderActiveField] = useReduxState(
    formBuilderSelectors.activeField,
    actions.setActiveField
  );

  const [{ value: blockConfig }] = useField<BlockConfig>(blockFieldName);

  const [previewInfo] = usePreviewInfo(blockConfig?.id);

  const showFormPreview = configValue?.schema && configValue?.uiSchema;
  const showBlockPreview =
    (record && blockConfig) || previewInfo?.traceOptional;

  const defaultKey = showFormPreview ? "preview" : "output";

  return (
    <Tab.Container defaultActiveKey={defaultKey}>
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
      <Tab.Content>
        <DataTab
          eventKey="context"
          isLoading={isLoading}
          isTraceEmpty={!record}
          error={error}
        >
          <JsonTree data={relevantContext} copyable searchable />
        </DataTab>
        {showDeveloperTabs && (
          <>
            <DataTab eventKey="formik">
              <div className="text-info">
                <FontAwesomeIcon icon={faInfoCircle} /> This tab is only visible
                to developers
              </div>
              <JsonTree data={formState ?? {}} searchable />
            </DataTab>
            <DataTab eventKey="blockConfig">
              <div className="text-info">
                <FontAwesomeIcon icon={faInfoCircle} /> This tab is only visible
                to developers
              </div>
              <JsonTree data={blockConfig ?? {}} />
            </DataTab>
          </>
        )}
        <DataTab
          eventKey="rendered"
          isLoading={isLoading}
          isTraceEmpty={!record}
          error={error}
        >
          {record && (
            <JsonTree data={record.renderedArgs} copyable searchable />
          )}
        </DataTab>
        <DataTab
          eventKey="output"
          isLoading={isLoading}
          isTraceEmpty={!record}
          isTraceOptional={previewInfo?.traceOptional}
          error={error}
        >
          {record && "output" in record && (
            <JsonTree data={record.output} copyable searchable label="Data" />
          )}
          {record && "error" in record && (
            <JsonTree data={record.error} label="Error" />
          )}
        </DataTab>
        <DataTab
          eventKey="preview"
          isLoading={isLoading}
          isTraceEmpty={false}
          error={null}
          // Only mount if the user is viewing it, because output previews take up resources to run
          mountOnEnter
          unmountOnExit
        >
          {showFormPreview ? (
            <ErrorBoundary>
              <FormPreview
                name={blockFieldConfigName}
                activeField={formBuilderActiveField}
                setActiveField={setFormBuilderActiveField}
              />
            </ErrorBoundary>
          ) : // eslint-disable-next-line unicorn/no-nested-ternary -- pre-commit removes the parens
          showBlockPreview ? (
            <ErrorBoundary>
              <BlockPreview traceRecord={record} blockConfig={blockConfig} />
            </ErrorBoundary>
          ) : (
            <div className="text-muted">
              Run the extension once to enable live preview
            </div>
          )}
        </DataTab>
      </Tab.Content>
    </Tab.Container>
  );
};

export default DataPanel;
