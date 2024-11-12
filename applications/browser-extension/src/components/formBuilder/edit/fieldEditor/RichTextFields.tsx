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
import SchemaField from "@/components/fields/schemaFields/SchemaField";

const RichTextFields: React.FunctionComponent<{ uiOptionsPath: string }> = ({
  uiOptionsPath,
}) => {
  const configName = partial(joinName, uiOptionsPath);

  return (
    <SchemaField
      name={configName("database")}
      isRequired
      schema={{
        $ref: "https://app.pixiebrix.com/schemas/database#",
        title: "Database",
        description:
          "Asset database to use for image upload. Asset databases are a specific kind of database and" +
          " can be created in the Admin Console.",
      }}
      uiSchema={{
        "ui:widget": "database",
      }}
    />
  );
};

export default RichTextFields;
