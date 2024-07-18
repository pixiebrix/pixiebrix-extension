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

import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import DataTab from "@/pageEditor/tabs/editTab/dataPanel/DataTab";
import React, { useMemo, useState } from "react";
import { type TraceRecord } from "@/telemetry/trace";
import { type Nullishable } from "@/utils/nullishUtils";
import { FormCheck } from "react-bootstrap";
import { isEmpty, pickBy } from "lodash";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";

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

/**
 * All variables available to the brick, even if the brick didn't run or there was an error rendering the arguments.
 */
const VariablesBody: React.FunctionComponent<{ traceRecord: TraceRecord }> = ({
  traceRecord,
}) => {
  const relevantContext = useMemo(
    () => pickBy(traceRecord?.templateContext ?? {}, contextFilter),
    [traceRecord?.templateContext],
  );

  return (
    <DataTabJsonTree
      data={contextAsPlainObject(relevantContext)}
      copyable
      searchable
      tabKey={DataPanelTabKey.Input}
      label="Available Variables"
    />
  );
};

const ArgumentsBody: React.FunctionComponent<{ traceRecord: TraceRecord }> = ({
  traceRecord,
}) => {
  if (traceRecord.renderError) {
    return (
      <>
        {traceRecord.skippedRun ? (
          <Alert variant="info">
            Error rendering input arguments, but brick was skipped because
            condition was not met
          </Alert>
        ) : (
          <Alert variant="danger">Error rendering input arguments</Alert>
        )}
        <ErrorDisplay error={traceRecord.renderError} />
      </>
    );
  }

  return (
    <DataTabJsonTree
      data={traceRecord?.renderedArgs}
      copyable
      searchable
      tabKey={DataPanelTabKey.Input}
      label="Arguments"
    />
  );
};

/**
 * Data Panel tab displaying input arguments and variables.
 * @since 2.0.6
 */
const InputDataTab: React.FunctionComponent<{
  traceRecord: Nullishable<TraceRecord>;
  isInputStale: boolean;
}> = ({ isInputStale, traceRecord }) => {
  const [value, setValue] = useState<"arguments" | "variables">("arguments");

  return (
    <DataTab eventKey={DataPanelTabKey.Input} isTraceEmpty={!traceRecord}>
      {isInputStale && (
        <Alert variant="warning">
          A previous brick has changed, input may be out of date
        </Alert>
      )}
      <div className="d-flex">
        <div>View</div>
        <div>
          <FormCheck
            type="radio"
            value="arguments"
            checked={value === "arguments"}
            onChange={() => {
              setValue("arguments");
            }}
            label="Arguments"
            name="inputView"
            id="inputViewArguments"
          />
        </div>
        <div>
          <FormCheck
            type="radio"
            value="variables"
            checked={value === "variables"}
            onChange={() => {
              setValue("variables");
            }}
            label="Variables"
            name="inputView"
            id="inputViewVariables"
          />
        </div>
      </div>

      {value === "arguments" ? (
        <ArgumentsBody traceRecord={traceRecord} />
      ) : (
        <VariablesBody traceRecord={traceRecord} />
      )}
    </DataTab>
  );
};

export default InputDataTab;
