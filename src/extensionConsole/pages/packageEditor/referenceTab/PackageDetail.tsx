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

import styles from "./PackageDetail.module.scss";

import React, { Suspense } from "react";
import { Button } from "react-bootstrap";
import { isEmpty } from "lodash";
import AceEditor from "@/components/AceEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboard,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import useUserAction from "@/hooks/useUserAction";
import DetailSection from "./DetailSection";
import { type Schema } from "@/types/schemaTypes";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import BrickIcon from "@/components/BrickIcon";
import { writeToClipboard } from "@/utils/clipboardUtils";
import { type PackageInstance } from "@/types/registryTypes";
import { MARKETPLACE_URL } from "@/urlConstants";

function makeArgumentYaml(schema: Schema): string {
  let result = "";
  if (schema.type !== "object") {
    return result;
  }

  for (const [prop, value] of Object.entries(schema.properties ?? {})) {
    if (typeof value === "boolean") {
      continue;
    }

    result += `# ${prop}: ${value.type as string} (${
      schema.required?.includes(prop) ? "required" : "optional"
    })\n`;
    if (value.description) {
      for (const line of value.description.split("\n")) {
        result += `# ${line} \n`;
      }
    }

    if (value.enum) {
      result += "# valid values:\n";
      for (const line of value.enum) {
        result += `# - ${line as string} \n`;
      }
    }

    result += `# ${prop.includes(" ") ? `"${prop}"` : prop}: \n`;
  }

  return result;
}

type OwnProps<T extends PackageInstance> = {
  packageInstance: T;
  packageConfig: string;
  isPackageConfigLoading: boolean;
};

const PackageDetail = <T extends PackageInstance>({
  packageInstance,
  packageConfig,
  isPackageConfigLoading,
}: OwnProps<T>) => {
  const schema =
    "schema" in packageInstance
      ? packageInstance.schema
      : "inputSchema" in packageInstance
        ? packageInstance.inputSchema
        : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix brick typing
  const outputSchema = (packageInstance as any).outputSchema as Schema;
  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const listing = listings[packageInstance.id];

  const copyHandler = useUserAction(
    async () => {
      await writeToClipboard({ text: makeArgumentYaml(schema as Schema) });
    },
    {
      successMessage: "Copied input argument YAML to clipboard",
      errorMessage: "Error copying YAML to clipboard",
    },
    [schema],
  );

  return (
    <div className={styles.root}>
      <div className="d-flex justify-content-between">
        <div>
          <h3 className="text-left">
            {packageInstance.name}&nbsp;
            <BrickIcon key={packageInstance.id} brick={packageInstance} />
          </h3>
          <p>
            <code className="p-0">{packageInstance.id}</code>
          </p>
        </div>
        {listing && (
          <div className="ml-4">
            <Button
              href={`${MARKETPLACE_URL}${listing.id}/`}
              size="sm"
              variant="link"
              target="_blank"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} /> View in Marketplace
            </Button>
          </div>
        )}
      </div>

      <DetailSection title="Description">
        {packageInstance.description ?? (
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
            <SchemaTree schema={schema as Schema} />
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
        {isPackageConfigLoading ? (
          <div className="text-muted">Loading...</div>
        ) : isEmpty(packageConfig) ? (
          <div className="text-muted">
            Definition not available for built-in packages
          </div>
        ) : (
          <Suspense fallback={<div className="text-muted">Loading...</div>}>
            <AceEditor
              value={packageConfig}
              mode="yaml"
              theme="chrome"
              width="100%"
              // Prevent scrolling by allowing the AceEditor height to auto fit content
              // https://github.com/securingsincity/react-ace/issues/415#issuecomment-436623269
              maxLines={Number.POSITIVE_INFINITY}
              readOnly
            />
          </Suspense>
        )}
      </DetailSection>
    </div>
  );
};

export default PackageDetail;
