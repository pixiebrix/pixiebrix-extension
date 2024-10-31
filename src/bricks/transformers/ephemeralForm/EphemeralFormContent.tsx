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

import "@/vendors/bootstrapWithoutRem.css";
import "@/sidebar/sidebarBootstrapOverrides.scss";
import "@/bricks/renderers/customForm.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import React from "react";
import validator from "@/validators/formValidator";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { cancelForm, resolveForm } from "@/contentScript/messenger/api";
import { type Target } from "@/types/messengerTypes";
import { cloneDeep } from "lodash";
import { type FormDefinition } from "@/platform/forms/formTypes";
import { type UUID } from "@/types/stringTypes";
import { templates } from "@/components/formBuilder/RjsfTemplates";
import ImageCropWidget from "@/components/formBuilder/widgets/ImageCropWidget";
import DescriptionField from "@/components/formBuilder/DescriptionField";
import RjsfSelectWidget from "@/components/formBuilder/widgets/RjsfSelectWidget";
import TextAreaWidget from "@/components/formBuilder/widgets/TextAreaWidget";
import { Stylesheets } from "@/components/Stylesheets";
import { useStylesheetsContextWithFormDefault } from "@/components/StylesheetsContext";
import RichTextWidget from "@/components/formBuilder/widgets/RichTextWidget";

export const fields = {
  DescriptionField,
};
export const uiWidgets = {
  imageCrop: ImageCropWidget,
  SelectWidget: RjsfSelectWidget,
  TextareaWidget: TextAreaWidget,
  richText: RichTextWidget,
} as const;

export type EphemeralFormContentProps = {
  definition: FormDefinition;
  target: Target;
  nonce: UUID;
  isModal: boolean;
};

const EphemeralFormContent: React.FC<EphemeralFormContentProps> = ({
  definition,
  target,
  nonce,
  isModal,
}) => {
  const {
    schema,
    uiSchema,
    cancelable,
    submitCaption,
    stylesheets: newStylesheets,
    disableParentStyles,
  } = definition;

  // Ephemeral form can never be nested, but we use this to pull in
  // the (boostrap) base themes
  const { stylesheets } = useStylesheetsContextWithFormDefault({
    newStylesheets,
    disableParentStyles: disableParentStyles ?? false,
  });

  return (
    <Stylesheets href={stylesheets}>
      <JsonSchemaForm
        // Deep clone the schema because otherwise the schema is not extensible, which
        // breaks validation when @cfworker/json-schema dereferences the schema
        // See https://github.com/cfworker/cfworker/blob/263260ea661b6f8388116db7b8daa859e0d28b25/packages/json-schema/src/dereference.ts#L115
        schema={cloneDeep(schema)}
        uiSchema={uiSchema}
        fields={fields}
        widgets={uiWidgets}
        validator={validator}
        templates={templates}
        onSubmit={({ formData: values }) => {
          void resolveForm(target, nonce, values);
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            {submitCaption}
          </button>
          {cancelable && isModal && (
            <button
              className="btn btn-link"
              type="button"
              onClick={() => {
                cancelForm(target, nonce);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </JsonSchemaForm>
    </Stylesheets>
  );
};

export default EphemeralFormContent;
