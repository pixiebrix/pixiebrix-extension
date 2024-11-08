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

import "../../vendors/bootstrapWithoutRem.css";
import "../../sidebar/sidebarBootstrapOverrides.scss";
import "./customForm.css";
import React, { useEffect, useRef, useState } from "react";
import { type Schema, type UiSchema } from "../../types/schemaTypes";
import { type JsonObject } from "type-fest";
import cx from "classnames";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Stylesheets } from "@/components/Stylesheets";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import validator from "../../validators/formValidator";
import { type IChangeEvent } from "@rjsf/core";
import { templates } from "@/components/formBuilder/RjsfTemplates";
import ImageCropWidget from "@/components/formBuilder/widgets/ImageCropWidget";
import RjsfSelectWidget from "@/components/formBuilder/widgets/RjsfSelectWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import TextAreaWidget from "@/components/formBuilder/widgets/TextAreaWidget";
import RjsfSubmitContext from "@/components/formBuilder/RjsfSubmitContext";
import { cloneDeep } from "lodash";
import { useStylesheetsContextWithFormDefault } from "@/components/StylesheetsContext";
import RichTextWidget from "@/components/formBuilder/widgets/RichTextWidget";

const FIELDS = {
  DescriptionField,
} as const;

const UI_WIDGETS = {
  imageCrop: ImageCropWidget,
  SelectWidget: RjsfSelectWidget,
  TextareaWidget: TextAreaWidget,
  richText: RichTextWidget,
} as const;

export type CustomFormComponentProps = {
  schema: Schema;
  uiSchema: UiSchema;
  submitCaption: string;
  formData: JsonObject;
  autoSave: boolean;
  /**
   * Form submission handler.
   * @param values the submitted values
   * @param submissionCount the number of times the form has been submitted (For tracing)
   * UnknownObject is used instead of JsonObject because strictNullChecks throws
   * `Type instantiation is excessively deep and possibly infinite.`
   */
  onSubmit: (
    values: UnknownObject,
    { submissionCount }: { submissionCount: number },
  ) => Promise<void>;
  resetOnSubmit?: boolean;
  className?: string;
  stylesheets?: string[];
  disableParentStyles?: boolean;
};

const CustomFormComponent: React.FunctionComponent<
  CustomFormComponentProps
> = ({
  schema,
  uiSchema,
  submitCaption,
  formData,
  autoSave,
  className,
  onSubmit,
  resetOnSubmit = false,
  disableParentStyles = false,
  stylesheets: newStylesheets,
}) => {
  // Use useRef instead of useState because we don't need/want a re-render when count changes
  // This ref is used to track the onSubmit run number for runtime tracing
  const submissionCountRef = useRef(0);

  // Track values during onChange or prop updates, so we can access it our RjsfSubmitContext submitForm callback
  const valuesRef = useRef<UnknownObject>(formData);
  useEffect(() => {
    // XXX: is there a reason this is in a useEffect? Is it to prevent issues with defaulting to a fresh `{}`?
    valuesRef.current = formData ?? {};
  }, [formData]);

  // Use a React key to reset the form: https://github.com/rjsf-team/react-jsonschema-form/issues/953
  const [key, setKey] = useState(0);
  const resetForm = (): void => {
    // Ensure valuesRef is in sync with the initial data passed to the form
    valuesRef.current = formData;
    setKey((prev) => prev + 1);
  };

  const { stylesheets } = useStylesheetsContextWithFormDefault({
    newStylesheets,
    disableParentStyles,
  });

  const submitData = async (data: UnknownObject): Promise<void> => {
    submissionCountRef.current += 1;
    await onSubmit(data, {
      submissionCount: submissionCountRef.current,
    });

    if (resetOnSubmit) {
      resetForm();
    }
  };

  return (
    <div
      className={cx("CustomForm", className, {
        // Since 1.7.33, support a className prop to allow for adjusting margin/padding. To maintain the legacy
        // behavior, apply the default only if the className prop is not provided.
        "p-3": className === undefined,
      })}
    >
      <ErrorBoundary>
        <Stylesheets href={stylesheets}>
          <RjsfSubmitContext.Provider
            value={{
              async submitForm() {
                await submitData(valuesRef.current);
              },
            }}
          >
            <JsonSchemaForm
              key={key}
              // Deep clone the schema because otherwise the schema is not extensible
              // This breaks validation when @cfworker/json-schema dereferences the schema
              // See https://github.com/cfworker/cfworker/blob/263260ea661b6f8388116db7b8daa859e0d28b25/packages/json-schema/src/dereference.ts#L115
              schema={cloneDeep(schema)}
              uiSchema={uiSchema}
              formData={formData}
              fields={FIELDS}
              widgets={UI_WIDGETS}
              validator={validator}
              templates={templates}
              onChange={async ({ formData }: IChangeEvent<UnknownObject>) => {
                valuesRef.current = formData ?? {};

                if (autoSave) {
                  await submitData(formData ?? {});
                }
              }}
              onSubmit={async ({ formData }: IChangeEvent<UnknownObject>) => {
                await submitData(formData ?? {});
              }}
            >
              {autoSave || uiSchema["ui:submitButtonOptions"]?.norender ? (
                // XXX: Due to a bug in RJSF, rendering a child react component for the Form will cause infinite
                //  rerenders in dev mode. To get around this, we return `true` in order to avoid rendering the
                //  default submitButton. RJSF forces us to provide a non-falsy children prop if we want to render
                //  our own submit button component. `true` avoids rendering anything to the dom while avoiding
                //  the infinite rerender bug. See:
                //  https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/core/src/components/Form.tsx#L919
                //  https://github.com/rjsf-team/react-jsonschema-form/issues/1693
                true
              ) : (
                <div>
                  <button className="btn btn-primary" type="submit">
                    {submitCaption}
                  </button>
                </div>
              )}
            </JsonSchemaForm>
          </RjsfSubmitContext.Provider>
        </Stylesheets>
      </ErrorBoundary>
    </div>
  );
};

export default CustomFormComponent;
