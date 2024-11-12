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
import { partial } from "lodash";
import { joinName } from "@/utils/formUtils";
import { useField } from "formik";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Collapse } from "react-bootstrap";

const TextAreaFields: React.FC<{ uiOptionsPath: string }> = ({
  uiOptionsPath,
}) => {
  const configName = partial(joinName, uiOptionsPath);
  const [{ value: showSubmitToolbar }] = useField<boolean | null>(
    configName("submitToolbar", "show"),
  );

  return (
    <>
      <SchemaField
        name={configName("rows")}
        schema={{
          type: "number",
          title: "# Rows",
          description:
            "The number of visible text lines for the control. If it is not specified, the default value is 2.",
        }}
      />
      <SchemaField
        name={configName("submitOnEnter")}
        schema={{
          type: "boolean",
          title: "Submit Form on Enter?",
          description:
            "If enabled, pressing Enter will submit the form. Press Shift+Enter for newlines in this mode",
        }}
        isRequired
      />
      <SchemaField
        name={configName("submitToolbar", "show")}
        schema={{
          type: "boolean",
          title: "Include Submit Toolbar?",
          description:
            "Enable the submit toolbar that has a selectable icon to act as a submit button",
        }}
        isRequired
      />
      <Collapse in={showSubmitToolbar ?? false}>
        <SchemaField
          name={configName("submitToolbar", "icon")}
          schema={{ $ref: "https://app.pixiebrix.com/schemas/icon#" }}
          label="Select Icon"
          description="Select the icon that appears in the bottom right of the Submit Toolbar"
          uiSchema={{
            "ui:widget": "IconWidget",
          }}
        />
      </Collapse>
    </>
  );
};

export default TextAreaFields;
