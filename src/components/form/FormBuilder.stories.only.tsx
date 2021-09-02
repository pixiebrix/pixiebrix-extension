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

// eslint-disable-next-line filenames/match-exported
import { ComponentMeta, ComponentStory } from "@storybook/react";
import React, { useState } from "react";
import { action } from "@storybook/addon-actions";
import FormBuilder from "./FormBuilder";
import { Schema } from "@/core";
import FormRenderer from "./FormRenderer";

const initialSchema: Schema = {
  title: "A form",
  description: "A form example.",
  type: "object",
  required: [],
  properties: {
    firstName: {
      type: "string",
      title: "First name",
      default: "Chuck",
    },
    lastName: {
      type: "string",
      title: "Last name",
    },
    telephone: {
      type: "string",
      title: "Telephone",
      minLength: 10,
    },
  },
};

const FormBuilderStory = () => {
  // Form config formatted as from schema for the presenter
  const [schema, setSchema] = useState(initialSchema);
  const [activeField, setActiveField] = useState("");

  return (
    <div className="d-flex">
      <div className="m-5">
        <FormBuilder
          currentSchema={schema}
          onSchemaChanged={setSchema}
          onSave={(schema) => {
            action("onSave")(schema);
          }}
          activeField={activeField}
          setActiveField={(fieldName) => {
            setActiveField(fieldName);
            action("setActiveField")(fieldName);
          }}
        />
      </div>
      <div className="m-5">
        <FormRenderer
          schema={schema}
          onSubmit={({ formData }) => {
            action("ui form submitted")(formData);
          }}
          activeField={activeField}
          setActiveField={(fieldName) => {
            setActiveField(fieldName);
            action("setActiveField")(fieldName);
          }}
        />
      </div>
    </div>
  );
};

const componentMeta: ComponentMeta<typeof FormBuilderStory> = {
  title: "Form builder",
  component: FormBuilderStory,
};

const Template: ComponentStory<typeof FormBuilderStory> = (args) => (
  <FormBuilderStory {...args} />
);

export const Default = Template.bind({});

export default componentMeta;
