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

import React, { Suspense } from "react";
import { Button } from "react-bootstrap";
import { isEmpty } from "lodash";
import copy from "copy-to-clipboard";
import AceEditor from "@/vendors/AceEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboard,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import useUserAction from "@/hooks/useUserAction";
import DetailSection from "./DetailSection";
import { ReferenceEntry } from "@/options/pages/brickEditor/brickEditorTypes";
import { Schema } from "@/core";
import styles from "./BrickDetail.module.scss";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import BrickIcon from "@/components/BrickIcon";

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
  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const listing = listings[brick.id];

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

  console.log("Brick:", brick);

  return (
    <div className={styles.root}>
      <div className="d-flex justify-content-between">
        <div>
          <h3 className="text-left">
            {brick.name}&nbsp;
            <BrickIcon key={brick.id} brick={brick} />
          </h3>
          <p>
            <code className="p-0">{brick.id}</code>
          </p>
        </div>
        {listing && (
          <div className="ml-4">
            <a
              href={`https://pixiebrix.com/marketplace/${listing.id}`}
              className="btn btn-sm btn-link text-info text-nowrap"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} /> View in Marketplace
            </a>
          </div>
        )}
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
            <Button className="p-0 mb-3" variant="link" onClick={copyHandler}>
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
          <Suspense fallback={<div className="text-muted">Loading...</div>}>
            <AceEditor
              value={brickConfig}
              mode="yaml"
              theme="chrome"
              width="100%"
              readOnly
            />
          </Suspense>
        )}
      </DetailSection>
    </div>
  );
};

export default BrickDetail;
