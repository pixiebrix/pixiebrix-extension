/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { type ChangeEvent } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { partial } from "lodash";
import { joinName } from "@/utils";
import { Card } from "react-bootstrap";
import TourStep, {
  type StepInputs,
  TourStepTransformer,
} from "@/blocks/transformers/tourStep/tourStep";
import { useField, useFormikContext } from "formik";
import {
  isPipelineExpression,
  type PipelineExpression,
} from "@/runtime/mapArgs";
import { type Expression, type Schema } from "@/core";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import { createNewBlock } from "@/pageEditor/exampleBlockConfigs";
import { DocumentRenderer } from "@/blocks/renderers/document";

const brick = new TourStep();

const Section: React.FunctionComponent<{ title: string }> = ({
  title,
  children,
}) => (
  <Card>
    <Card.Header>{title}</Card.Header>
    <Card.Body>{children}</Card.Body>
  </Card>
);

const TourStepOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const { setFieldValue } = useFormikContext<FormState>();

  const configName = partial(joinName, name, configKey);

  const [{ value: body }] = useField<Expression>(configName("body"));
  const [{ value: onBeforeShow }] = useField<PipelineExpression | null>(
    configName("onBeforeShow")
  );
  const [{ value: onAfterShow }] = useField<PipelineExpression | null>(
    configName("onAfterShow")
  );
  const [{ value: appearance }] = useField<StepInputs["appearance"] | null>(
    configName("appearance")
  );

  return (
    <>
      <SchemaField
        name={configName("title")}
        label="Step Title"
        schema={brick.inputSchema.properties.title as Schema}
        isRequired
      />

      <SchemaField
        label="Target Selector"
        name={configName("selector")}
        schema={brick.inputSchema.properties.selector as Schema}
      />

      <SchemaField
        label="Last Step?"
        name={configName("isLastStep")}
        schema={brick.inputSchema.properties.isLastStep as Schema}
      />

      <Section title="Step Body">
        <FieldTemplate
          as={SwitchButtonWidget}
          label="Custom Body"
          description="Toggle on to provide a renderer brick for the step body. Edit the body in the Outline Panel"
          name={configName("body")}
          value={isPipelineExpression(body)}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(configName("body"), {
                __type__: "pipeline",
                __value__: [
                  createNewBlock(DocumentRenderer.BLOCK_ID, {
                    parentBlockId: TourStepTransformer.BLOCK_ID,
                  }),
                ],
              });
            } else {
              setFieldValue(configName("body"), {
                __type__: "nunjucks",
                __value__: "Enter step content, supports **markdown**",
              });
            }
          }}
        />

        {isPipelineExpression(body) && (
          <SchemaField
            label="Auto Refresh"
            name={configName("appearance", "refreshTrigger")}
            isRequired
            schema={{
              type: "string",
              format: "markdown",
              enum: ["manual", "statechange"],
              description: "An optional trigger to refresh the panel",
            }}
          />
        )}

        {!isPipelineExpression(body) && (
          <SchemaField
            label="Body"
            name={configName("body")}
            isRequired
            schema={{
              type: "string",
              format: "markdown",
              description: "Content of the step, supports markdown",
            }}
          />
        )}
      </Section>

      <Section title="Targeting Behavior">
        <FieldTemplate
          as={SwitchButtonWidget}
          label="Wait for Target"
          description="Wait for the target element to be added to the page"
          name={configName("appearance", "wait")}
          value={Boolean(appearance?.wait)}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(configName("appearance", "wait"), {
                maxWaitMillis: 0,
              });
            } else {
              setFieldValue(configName("appearance", "wait"), null);
            }
          }}
        />

        {appearance.wait && (
          <SchemaField
            name={configName("appearance", "wait", "maxWaitMillis")}
            label="Max Wait Time (ms)"
            schema={{
              type: "integer",
              description:
                "Maximum time to wait in milliseconds. If the value is less than or equal to zero, will wait indefinitely",
            }}
          />
        )}

        <SchemaField
          name={configName("appearance", "skippable")}
          label="Skippable"
          isRequired
          schema={{
            type: "boolean",
            description: "Skip the step if the target element is not found",
          }}
        />
      </Section>

      <Section title="Step Actions">
        <FieldTemplate
          as={SwitchButtonWidget}
          label="Pre-Step Actions"
          description="Toggle on to run actions before the step is shown. Edit the actions in the Outline Panel"
          name={configName("onBeforeShow")}
          value={onBeforeShow != null}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(configName("onBeforeShow"), {
                __type__: "pipeline",
                __value__: [],
              });
            } else {
              setFieldValue(configName("onBeforeShow"), null);
            }
          }}
        />

        <FieldTemplate
          as={SwitchButtonWidget}
          label="Post-Step Actions"
          description="Toggle on to run actions after the step is completed. Edit the actions in the Outline Panel"
          name={configName("onAfterShow")}
          value={onAfterShow != null}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(configName("onAfterShow"), {
                __type__: "pipeline",
                __value__: [],
              });
            } else {
              setFieldValue(configName("onAfterShow"), null);
            }
          }}
        />
      </Section>

      <Section title="Scroll Behavior">
        <FieldTemplate
          as={SwitchButtonWidget}
          label="Scroll to Element"
          description="Toggle on to automatically scroll to the element"
          name={configName("appearance", "scroll")}
          value={Boolean(appearance?.scroll)}
          onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
            if (target.value) {
              setFieldValue(configName("appearance", "scroll"), {
                behavior: "auto",
              });
            } else {
              setFieldValue(configName("appearance", "scroll"), null);
            }
          }}
        />

        {appearance?.scroll && (
          <SchemaField
            name={configName("appearance", "scroll", "behavior")}
            label="Scroll Behavior"
            schema={{
              type: "string",
              enum: ["auto", "smooth"],
              default: "auto",
              description: "Defines the transition animation",
            }}
          />
        )}
      </Section>

      <Section title="Highlight Behavior">
        <SchemaField
          name={configName("appearance", "highlight", "backgroundColor")}
          label="Highlight Color"
          schema={{
            type: "string",
            description:
              "Color to highlight the element with when the step is active. Can be any valid CSS color value",
          }}
        />
      </Section>

      <Section title="Popover Behavior">
        <SchemaField
          name={configName("appearance", "popover", "placement")}
          label="Placement"
          description="Location to place the popover relative to the target element"
          schema={{
            type: "string",
            enum: [
              "auto",
              "auto-start",
              "auto-end",
              "top",
              "top-start",
              "top-end",
              "bottom",
              "bottom-start",
              "bottom-end",
              "right",
              "right-start",
              "right-end",
              "left",
              "left-start",
              "left-end",
            ],
            default: "auto",
          }}
        />
      </Section>
    </>
  );
};

export default TourStepOptions;
