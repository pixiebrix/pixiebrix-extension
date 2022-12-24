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

import React, { useEffect, useMemo, useRef } from "react";
import { type RegistryId } from "@/core";
import { getIn, useField, useFormikContext } from "formik";
import useBlockOptions from "@/hooks/useBlockOptions";
import { Card } from "react-bootstrap";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import Loader from "@/components/Loader";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { joinName } from "@/utils";
import { useAsyncState } from "@/hooks/common";
import SelectWidget, {
  type Option,
} from "@/components/form/widgets/SelectWidget";
import { partial } from "lodash";
import { type BlockConfig, type BlockWindow } from "@/blocks/types";
import AdvancedLinks, {
  DEFAULT_WINDOW_VALUE,
} from "@/pageEditor/tabs/effect/AdvancedLinks";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import FieldSection from "@/pageEditor/fields/FieldSection";
import getType from "@/runtime/getType";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import ConfigurationTitle from "./ConfigurationTitle";

const rootModeOptions = [
  { label: "Inherit", value: "inherit" },
  { label: "Document", value: "document" },
  { label: "Element", value: "element" },
];

const targetOptions: Array<Option<BlockWindow>> = [
  { label: "Current Tab (self)", value: "self" },
  { label: "Opener Tab (opener)", value: "opener" },
  { label: "Target Tab (target)", value: "target" },
  { label: "Top-level Frame (top)", value: "top" },
  { label: "All Tabs (broadcast)", value: "broadcast" },
];

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  blockId: RegistryId;
}> = ({ name, blockId }) => {
  const configName = partial(joinName, name);

  const context = useFormikContext<FormState>();
  const [config] = useField<BlockConfig>(name);
  const [_rootField, _rootFieldMeta, rootFieldHelpers] = useField<BlockConfig>(
    configName("root")
  );
  const blockErrors = getIn(context.errors, name);

  const [{ block, error }, BlockOptions] = useBlockOptions(blockId);

  // Conditionally show Advanced options "Condition" and "Target" depending on the value of blockType.
  // If blockType is undefined, don't show the options.
  // If error happens, behavior is undefined.
  const [blockType] = useAsyncState(async () => getType(block), [block]);

  const [isRootAware] = useAsyncState(async () => block.isRootAware(), [block]);

  const advancedOptionsRef = useRef<HTMLDivElement>();

  useEffect(
    () => {
      if (config.value.rootMode !== "element") {
        rootFieldHelpers.setValue(null);
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps -- rootFieldHelpers changes reference every render
    [config.value.rootMode]
  );

  const rootElementSchema: SchemaFieldProps = useMemo(
    () => ({
      name: configName("root"),
      label: "Element",
      description: "The target element for the brick",
      schema: {
        $ref: "https://app.pixiebrix.com/schemas/element#",
      },
    }),
    [configName]
  );

  const ifSchemaProps: SchemaFieldProps = useMemo(
    () => ({
      name: configName("if"),
      schema: {
        type: ["string", "number", "boolean"],
      },
      label: "Condition",
      description: (
        <p>
          Condition determining whether or not to execute the brick. Truthy
          string values are&nbsp;
          <code>true</code>, <code>t</code>, <code>yes</code>, <code>y</code>,{" "}
          <code>on</code>, and <code>1</code> (case-insensitive)
        </p>
      ),
    }),
    [configName]
  );

  // Only show if the extension point supports a target mode. menuItem implicitly supports target mode, because
  // it's root-aware if multiple menu items are added to the page.
  // Technically trigger/quickBar/etc. allow the user to pick the target mode. But for now, show the field even if
  // the user has configured the extension point to use the document as the target.
  const showRootMode =
    isRootAware &&
    ["trigger", "contextMenu", "quickBar", "menuItem"].includes(
      context.values.type
    );
  const showIfAndTarget = blockType && blockType !== "renderer";
  const noAdvancedOptions = !showRootMode && !showIfAndTarget;

  return (
    <>
      <AdvancedLinks name={name} scrollToRef={advancedOptionsRef} />

      <Card>
        <FieldSection title={<ConfigurationTitle />}>
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
              <Loader />
            )}
          </SchemaFieldContext.Provider>
        </FieldSection>

        <FieldSection title="Advanced Options" bodyRef={advancedOptionsRef}>
          {showRootMode && (
            <ConnectedFieldTemplate
              name={configName("rootMode")}
              label="Root Mode"
              as={SelectWidget}
              options={rootModeOptions}
              blankValue="inherit"
              description="The root mode controls which page element PixieBrix provides as the implicit element"
            />
          )}

          {config.value.rootMode === "element" && (
            <SchemaField {...rootElementSchema} omitIfEmpty />
          )}

          {showIfAndTarget && (
            <>
              <SchemaField {...ifSchemaProps} omitIfEmpty />

              <ConnectedFieldTemplate
                name={configName("window")}
                label="Target"
                as={SelectWidget}
                options={targetOptions}
                blankValue={DEFAULT_WINDOW_VALUE}
                description="The tab/frame to run the brick. To ensure PixieBrix has permission to run on the tab, add an Extra Permissions pattern that matches the target tab URL"
              />
            </>
          )}

          {noAdvancedOptions && (
            <small className="text-muted font-italic">No options to show</small>
          )}
        </FieldSection>
      </Card>
    </>
  );
};

export default BlockConfiguration;
