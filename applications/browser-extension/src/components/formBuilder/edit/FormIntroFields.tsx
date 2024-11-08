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

import SchemaField from "../../fields/schemaFields/SchemaField";
import { type SchemaFieldProps } from "../../fields/schemaFields/propTypes";
import { joinName } from "../../../utils/formUtils";
import React, { useMemo } from "react";

/**
 * Form introductory fields for the form title and description.
 */
const FormIntroFields: React.FunctionComponent<{ name: string }> = ({
  name,
}) => {
  const { titleFieldProps, descriptionFieldProps } = useMemo(() => {
    const titleFieldProps: SchemaFieldProps = {
      name: joinName(name, "schema", "title"),
      schema: { type: "string" },
      label: "Form Title",
      description: "The form title to display",
    };
    const descriptionFieldProps: SchemaFieldProps = {
      name: joinName(name, "schema", "description"),
      schema: { type: "string" },
      label: "Form Description",
      description:
        "Form description or instructions. Supports [Markdown](https://docs.pixiebrix.com/developing-mods/developer-concepts/working-with-markdown)",
    };

    return { titleFieldProps, descriptionFieldProps };
  }, [name]);

  return (
    <>
      <SchemaField {...titleFieldProps} />
      <SchemaField {...descriptionFieldProps} />
    </>
  );
};

export default FormIntroFields;
