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

import React from "react";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import FormIntroFields from "@/components/formBuilder/edit/FormIntroFields";
import useReduxState from "@/hooks/useReduxState";
import ConfigErrorBoundary from "@/pageEditor/fields/ConfigErrorBoundary";
import { selectActiveBuilderPreviewElement } from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";
import ConnectedCollapsibleFieldSection from "@/pageEditor/fields/ConnectedCollapsibleFieldSection";
import { joinName } from "@/utils/formUtils";
import { partial } from "lodash";
import { TEMPORARY_FORM_SCHEMA } from "@/bricks/transformers/ephemeralForm/formTransformer";

export const FORM_MODAL_ID = validateRegistryId("@pixiebrix/form-modal");

const cancelableSchema: Schema = {
  type: "boolean",
  description: "Whether or not the user can cancel the form (default=true)",
  default: true,
};

const submitCaptionSchema: Schema = {
  type: "string",
  description: "The submit button caption (default='Submit')",
  default: "Submit",
};

const locationSchema: Schema = {
  type: "string",
  oneOf: [
    { const: "modal", title: "Modal" },
    { const: "sidebar", title: "Sidebar" },
  ],
  description: "The location of the form (default='Modal')",
  default: "modal",
};

const FormModalOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const baseName = joinName(name, configKey);
  const configName = partial(joinName, baseName);

  const [activeElement, setActiveElement] = useReduxState(
    selectActiveBuilderPreviewElement,
    editorActions.setActiveBuilderPreviewElement,
  );

  return (
    <>
      <ConnectedCollapsibleFieldSection
        title="Form Title/Description"
        initialExpanded
      >
        <FormIntroFields name={baseName} />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Form Submission" initialExpanded>
        <SchemaField
          name={configName("submitCaption")}
          label="Submit Button Text"
          schema={submitCaptionSchema}
          isRequired
        />
        <SchemaField
          name={configName("cancelable")}
          label="Cancelable?"
          schema={cancelableSchema}
          isRequired
        />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Form Location" initialExpanded>
        <SchemaField
          name={configName("location")}
          label="Location"
          schema={locationSchema}
          isRequired
        />
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title="Form Fields" initialExpanded>
        <ConfigErrorBoundary>
          <FormEditor
            name={baseName}
            activeField={activeElement}
            setActiveField={setActiveElement}
            fieldTypes={FORM_FIELD_TYPE_OPTIONS}
          />
        </ConfigErrorBoundary>
      </ConnectedCollapsibleFieldSection>

      <ConnectedCollapsibleFieldSection title={"Advanced: Theme"}>
        <SchemaField
          name={configName("stylesheets")}
          schema={TEMPORARY_FORM_SCHEMA.properties.stylesheets as Schema}
        />
        <SchemaField
          name={configName("disableParentStyles")}
          schema={
            TEMPORARY_FORM_SCHEMA.properties.disableParentStyles as Schema
          }
        />
      </ConnectedCollapsibleFieldSection>
    </>
  );
};

export default FormModalOptions;
