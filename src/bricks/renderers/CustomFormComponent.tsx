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

import React, { useRef } from "react";
import { type Schema, type UiSchema } from "@/types/schemaTypes";
import { type JsonObject } from "type-fest";
import cx from "classnames";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Stylesheets } from "@/components/Stylesheets";
import bootstrap from "bootstrap/dist/css/bootstrap.min.css?loadAsUrl";
import bootstrapOverrides from "@/pageEditor/sidebar/sidebarBootstrapOverrides.scss?loadAsUrl";
import custom from "@/bricks/renderers/customForm.css?loadAsUrl";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import validator from "@rjsf/validator-ajv6";
import { type IChangeEvent } from "@rjsf/core";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
import RjsfSelectWidget from "@/components/formBuilder/RjsfSelectWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import TextAreaWidget from "@/components/formBuilder/TextAreaWidget";
import RjsfSubmitContext from "@/components/formBuilder/RjsfSubmitContext";
import { templates } from "@/components/formBuilder/RjsfTemplates";
import { type UnknownObject } from "@/types/objectTypes";

const fields = {
  DescriptionField,
};

const uiWidgets = {
  imageCrop: ImageCropWidget,
  SelectWidget: RjsfSelectWidget,
  TextareaWidget: TextAreaWidget,
};

const CustomFormComponent: React.FunctionComponent<{
  schema: Schema;
  uiSchema: UiSchema;
  submitCaption: string;
  formData: JsonObject;
  autoSave: boolean;
  /**
   * Form submission handler.
   * @param values the submitted values
   * @param submissionCount the number of times the form has been submitted (For tracing)
   * UnkownObject is used instead of JsonObject because strictNullChecks throws
   * `Type instantiation is excessively deep and possibly infinite.`
   */
  onSubmit: (
    values: UnknownObject,
    { submissionCount }: { submissionCount: number },
  ) => Promise<void>;
  className?: string;
}> = ({
  schema,
  uiSchema,
  submitCaption,
  formData,
  autoSave,
  className,
  onSubmit,
}) => {
  // Use useRef instead of useState because we don't need/want a re-render when count changes
  const submissionCountRef = useRef(0);
  // Track values during onChange so we can access it our RjsfSubmitContext submitForm callback
  const valuesRef = useRef<UnknownObject>(formData);

  return (
    <div
      className={cx("CustomForm", className, {
        // Since 1.7.33, support a className prop to allow for adjusting margin/padding. To maintain the legacy
        // behavior, apply the default only if the className prop is not provided.
        "p-3": className === undefined,
      })}
    >
      <ErrorBoundary>
        <Stylesheets href={[bootstrap, bootstrapOverrides, custom]}>
          <RjsfSubmitContext.Provider
            value={{
              async submitForm() {
                submissionCountRef.current += 1;
                await onSubmit(valuesRef.current, {
                  submissionCount: submissionCountRef.current,
                });
              },
            }}
          >
            <JsonSchemaForm
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              fields={fields}
              widgets={uiWidgets}
              validator={validator}
              templates={templates}
              onChange={async ({ formData }: IChangeEvent<UnknownObject>) => {
                valuesRef.current = formData ?? {};

                if (autoSave) {
                  submissionCountRef.current += 1;
                  await onSubmit(formData ?? {}, {
                    submissionCount: submissionCountRef.current,
                  });
                }
              }}
              onSubmit={async ({ formData }: IChangeEvent<UnknownObject>) => {
                submissionCountRef.current += 1;
                await onSubmit(formData ?? {}, {
                  submissionCount: submissionCountRef.current,
                });
              }}
            >
              {autoSave || uiSchema["ui:submitButtonOptions"]?.norender ? (
                <div />
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
