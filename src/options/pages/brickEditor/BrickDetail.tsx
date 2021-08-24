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
import { makeArgumentYaml, DetailSection } from "./BrickReference";
import { ReferenceEntry } from "./referenceEntryType";
import * as localRegistry from "@/registry/localRegistry";
import { brickToYaml } from "@/utils/objToYaml";
import { Schema } from "@/core";
import { useAsyncState } from "@/hooks/common";

export const BrickDetail: React.FunctionComponent<{
  brick: ReferenceEntry;
}> = ({ brick }) => {
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

  const [brickConfig, isBrickConfigLoading] = useAsyncState(async () => {
    const brickPackage = await localRegistry.find(brick.id);
    return brickPackage?.config ? brickToYaml(brickPackage.config) : null;
  }, [brick]);

  return (
    <div>
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
          <AceEditor value={brickConfig} mode="yaml" theme="chrome" readOnly />
        )}
      </DetailSection>
    </div>
  );
};
