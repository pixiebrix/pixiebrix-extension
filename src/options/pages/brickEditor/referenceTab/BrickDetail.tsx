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

import React from "react";
import { Button } from "react-bootstrap";
import { isEmpty } from "lodash";
import copy from "copy-to-clipboard";
import AceEditor from "@/vendors/AceEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import useUserAction from "@/hooks/useUserAction";
import DetailSection from "./DetailSection";
import { ReferenceEntry } from "../brickEditorTypes";
import { Schema } from "@/core";
import styles from "./BrickDetail.module.scss";

function makeArgumentYaml(schema: Schema): string {
  let result = "";
  if (schema.type !== "object") {
    return result;
  }

  for (const [prop, value] of Object.entries(schema.properties)) {
    if (typeof value === "boolean") {
      continue;
    }

    result += `# ${prop}: ${value.type} (${
      schema.required.includes(prop) ? "required" : "optional"
    })\n`;
    if (value.description) {
      for (const line of value.description.split("\n")) {
        result += `# ${line} \n`;
      }
    }

    if (value.enum) {
      result += "# valid values:\n";
      for (const line of value.enum) {
        result += `# - ${line} \n`;
      }
    }

    result += `# ${prop.includes(" ") ? `"${prop}"` : prop}: \n`;
  }

  return result;
}

const BrickDetail: React.FunctionComponent<{
  brick: ReferenceEntry;
  brickConfig: string;
  isBrickConfigLoading: boolean;
}> = ({ brick, brickConfig, isBrickConfigLoading }) => {
  const schema = "schema" in brick ? brick.schema : brick.inputSchema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputSchema = (brick as any).outputSchema as Schema;

  const copyHandler = useUserAction(
    async () => {
      copy(makeArgumentYaml(schema));
    },
    {
      successMessage: "Copied input argument YAML to clipboard",
      errorMessage: "Error copying YAML to clipboard",
    },
    [schema]
  );

  return (
    <div className={styles.root}>
      <div>
        <h3>{brick.name}</h3>
        <code className="p-0">{brick.id}</code>
      </div>

      <DetailSection title="Description">
        {brick.description ?? (
          <span className="text-muted">No description provided</span>
        )}
      </DetailSection>

      <DetailSection title="Input Schema">
        {isEmpty(schema) ? (
          <div className="text-muted">No input schema provided</div>
        ) : (
          <div>
            <Button className="p-0" variant="link" onClick={copyHandler}>
              <FontAwesomeIcon icon={faClipboard} /> Copy Argument YAML
            </Button>
            <SchemaTree schema={schema} />
          </div>
        )}
      </DetailSection>

      <DetailSection title="Output Schema">
        {isEmpty(outputSchema) ? (
          <div className="text-muted">No output schema provided</div>
        ) : (
          <SchemaTree schema={outputSchema} />
        )}
      </DetailSection>

      <DetailSection title="Definition">
        {isBrickConfigLoading ? (
          <div className="text-muted">Loading...</div>
        ) : isEmpty(brickConfig) ? (
          <div className="text-muted">
            Definition not available for built-in bricks
          </div>
        ) : (
          <AceEditor
            value={brickConfig}
            mode="yaml"
            theme="chrome"
            width="100%"
            readOnly
          />
        )}
      </DetailSection>
    </div>
  );
};

export default BrickDetail;
