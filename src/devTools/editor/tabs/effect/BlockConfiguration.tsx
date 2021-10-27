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
import { getIn, useField, useFormikContext } from "formik";
import { useBlockOptions } from "@/hooks/useBlockOptions";
import { Button, Card } from "react-bootstrap";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import devtoolFieldOverrides from "@/devTools/editor/fields/devtoolFieldOverrides";
import GridLoader from "react-spinners/GridLoader";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./BlockConfiguration.module.scss";
import { joinName } from "@/utils";
import { useAsyncState } from "@/hooks/common";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { getType } from "@/blocks/util";
import { isEmpty, partial } from "lodash";
import { BlockIf, BlockWindow } from "@/blocks/types";

const DEFAULT_TEMPLATE_ENGINE_VALUE = "mustache";
const DEFAULT_WINDOW_VALUE = "self";

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  blockId: RegistryId;
}> = ({ name, blockId }) => {
  const configName = partial(joinName, name);

  const context = useFormikContext<FormState>();

  const blockErrors = getIn(context.errors, name);

  const [{ block, error }, BlockOptions] = useBlockOptions(blockId);
  const [blockType] = useAsyncState(async () => getType(block), [block]);

  const [isRootAware] = useAsyncState(async () => block.isRootAware(), [block]);

  const templateEngineFieldName = configName("templateEngine");
  const [{ value: templateEngineValue }] = useField<TemplateEngine>(
    templateEngineFieldName
  );

  const ifFieldName = configName("if");
  const [{ value: ifValue }] = useField<BlockIf>(ifFieldName);

  const windowFieldName = configName("window");
  const [{ value: windowValue }] = useField<BlockWindow>(windowFieldName);

  const advancedOptionsRef = useRef<HTMLDivElement>();

  const scrollToAdvancedOptions = () => {
    advancedOptionsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const customTemplateEngineSet =
    templateEngineValue &&
    templateEngineValue !== DEFAULT_TEMPLATE_ENGINE_VALUE;
  const ifSet = !isEmpty(ifValue);
  const customWindowSet = windowValue && windowValue !== DEFAULT_WINDOW_VALUE;
  const advancedOptionsSet =
    customTemplateEngineSet || ifSet || customWindowSet;

  return (
    <>
      {advancedOptionsSet && (
        <div className={styles.advancedLinks}>
          {customTemplateEngineSet && (
            <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
              {`Template Engine: ${templateEngineValue}`}
            </Button>
          )}
          {ifSet && (
            <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
              {`Condition: ${ifValue}`}
            </Button>
          )}
          {customWindowSet && (
            <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
              {`Target: ${windowValue}`}
            </Button>
          )}
        </div>
      )}

      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>Input</Card.Header>
        <Card.Body>
          <div>
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
          </div>
        </Card.Body>
      </Card>
      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>
          Advanced Options
        </Card.Header>
        <Card.Body ref={advancedOptionsRef}>
          <ConnectedFieldTemplate
            name={templateEngineFieldName}
            label="Template engine"
            as={SelectWidget}
            options={[
              { label: "Mustache", value: "mustache" },
              { label: "Handlebars", value: "handlebars" },
              { label: "Nunjucks", value: "nunjucks" },
            ]}
            description={
              <p>
                The template engine controls how PixieBrix fills in{" "}
                <code>{"{{variables}}"}</code> in the inputs.
              </p>
            }
          />

          {
            // Only show if necessary. Currently only the trigger extension point passes the element that triggered the
            // event through for the reader root
            isRootAware && context.values.type === "trigger" && (
              <ConnectedFieldTemplate
                name={configName("rootMode")}
                label="Root Mode"
                as={SelectWidget}
                options={[
                  { label: "Inherit", value: "inherit" },
                  { label: "Document", value: "document" },
                ]}
                defaultValue="inherit"
                description="The root mode controls which page element PixieBrix provides as the implicit element"
              />
            )
          }

          {blockType !== "renderer" && (
            <>
              <ConnectedFieldTemplate name={ifFieldName} label="Condition" />

              <ConnectedFieldTemplate
                name={windowFieldName}
                label="Target"
                as={SelectWidget}
                options={[
                  { label: "Self", value: "self" },
                  { label: "Opener", value: "opener" },
                  { label: "Target", value: "target" },
                  { label: "Broadcast", value: "broadcast" },
                  { label: "Remote", value: "remote" },
                ]}
                defaultValue="self"
                description={<p>Select where to execute the brick.</p>}
              />
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default BlockConfiguration;
