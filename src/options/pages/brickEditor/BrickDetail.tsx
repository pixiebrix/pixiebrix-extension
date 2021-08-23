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

import React, { useEffect } from "react";
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
import yaml from "yaml";

export const BrickDetail: React.FunctionComponent<{
  brick: ReferenceEntry;
}> = ({ brick }) => {
  const schema = "schema" in brick ? brick.schema : brick.inputSchema;

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

  useEffect(async () => localRegistry.syncRemote(), []);

  localRegistry.find(brick.id).then((val) => {
    console.log("brick", brick.id, val);
  });

  const brickYaml = new yaml.Document();
  brickYaml.contents = (brick as any).component || null;

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
        {isEmpty(brick.outputSchema) ? (
          <div className="text-muted">No output schema provided</div>
        ) : (
          <SchemaTree schema={brick.outputSchema} />
        )}
      </DetailSection>

      <DetailSection title="Configuration">
        {brick.component ? (
          <AceEditor
            value={
              // `rawConfig` is added by External(Block|Reader) etc.
              brickYaml.toString()
            }
          />
        ) : (
          <div className="text-muted">No configuration provided</div>
        )}
      </DetailSection>
    </div>
  );
};
