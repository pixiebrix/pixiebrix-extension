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

import React, { useRef } from "react";
import { RegistryId, TemplateEngine } from "@/core";
import { getIn, useFormikContext } from "formik";
import useBlockOptions from "@/hooks/useBlockOptions";
import { Card } from "react-bootstrap";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import devtoolFieldOverrides from "@/devTools/editor/fields/devtoolFieldOverrides";
import GridLoader from "react-spinners/GridLoader";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "@/devTools/editor/tabs/effect/BlockConfiguration.module.scss";
import { joinName } from "@/utils";
import { useAsyncState } from "@/hooks/common";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import SelectWidget, { Option } from "@/components/form/widgets/SelectWidget";
import { getType } from "@/blocks/util";
import { partial } from "lodash";
import { BlockWindow } from "@/blocks/types";
import AdvancedLinks, {
  DEFAULT_TEMPLATE_ENGINE_VALUE,
  DEFAULT_WINDOW_VALUE,
} from "@/devTools/editor/tabs/effect/AdvancedLinks";

const templateEngineDescription = (
  <p>
    The template engine controls how PixieBrix fills in{" "}
    <code>{"{{variables}}"}</code> in the inputs.
  </p>
);

const templateEngineOptions: Array<Option<TemplateEngine>> = [
  { label: "Mustache", value: "mustache" },
  { label: "Handlebars", value: "handlebars" },
  { label: "Nunjucks", value: "nunjucks" },
];

const rootModeOptions = [
  { label: "Inherit", value: "inherit" },
  { label: "Document", value: "document" },
];

const ifConditionDescription = (
  <p>
    Condition determining whether or not to execute the brick. Truthy string
    values are&nbsp;
    <code>true</code>, <code>t</code>, <code>yes</code>, <code>y</code>,{" "}
    <code>on</code>, and <code>1</code> (case-insensitive)
  </p>
);

const targetOptions: Array<Option<BlockWindow>> = [
  { label: "Current Tab (self)", value: "self" },
  { label: "Opener Tab (opener)", value: "opener" },
  { label: "Target Tab (target)", value: "target" },
  { label: "All Tabs (broadcast)", value: "broadcast" },
  { label: "Server (remote)", value: "remote" },
];

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  blockId: RegistryId;
}> = ({ name, blockId }) => {
  const configName = partial(joinName, name);

  const context = useFormikContext<FormState>();

  const blockErrors = getIn(context.errors, name);

  const [{ block, error }, BlockOptions] = useBlockOptions(blockId);

  // Conditionally show Advanced options "Condition" and "Target" depending on the value of blockType.
  // If blockType is undefined, don't show the options.
  // If error happens, behavior is undefined.
  const [blockType] = useAsyncState(async () => getType(block), [block]);

  const [isRootAware] = useAsyncState(async () => block.isRootAware(), [block]);

  const advancedOptionsRef = useRef<HTMLDivElement>();

  return (
    <>
      <AdvancedLinks name={name} scrollToRef={advancedOptionsRef} />

      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>Input</Card.Header>
        <Card.Body>
          <>
            <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
              {blockErrors?.id && (
                <div className="invalid-feedback d-block mb-4">
                  Unknown block {blockId}
                </div>
              )}
              {BlockOptions ? (
                <BlockOptions name={name} configKey="config" />
              ) : error ? (
                <div className="invalid-feedback d-block mb-4">{error}</div>
              ) : (
                <GridLoader />
              )}
            </SchemaFieldContext.Provider>
          </>
        </Card.Body>
      </Card>
      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>
          Advanced Options
        </Card.Header>
        <Card.Body ref={advancedOptionsRef}>
          <ConnectedFieldTemplate
            name={configName("templateEngine")}
            label="Template engine"
            as={SelectWidget}
            options={templateEngineOptions}
            blankValue={DEFAULT_TEMPLATE_ENGINE_VALUE}
            description={templateEngineDescription}
          />

          {
            // Only show if necessary. Currently only the trigger extension point passes the element that triggered the
            // event through for the reader root
            isRootAware &&
              ["trigger", "contextMenu"].includes(context.values.type) && (
                <ConnectedFieldTemplate
                  name={configName("rootMode")}
                  label="Root Mode"
                  as={SelectWidget}
                  options={rootModeOptions}
                  blankValue="inherit"
                  description="The root mode controls which page element PixieBrix provides as the implicit element"
                />
              )
          }

          {blockType && blockType !== "renderer" && (
            <>
              <ConnectedFieldTemplate
                name={configName("if")}
                label="Condition"
                description={ifConditionDescription}
              />

              <ConnectedFieldTemplate
                name={configName("window")}
                label="Target"
                as={SelectWidget}
                options={targetOptions}
                blankValue={DEFAULT_WINDOW_VALUE}
                description="Where to execute the brick."
              />
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default BlockConfiguration;
