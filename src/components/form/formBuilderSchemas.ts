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

import { Schema } from "@/core";
import { FORM_FIELD_TYPES } from "./formBuilderTypes";

const fieldSchema: Schema = {
  type: "object",
  required: ["name", "type"],
  properties: {
    name: {
      type: "string",
      title: "Name",
    },
    type: {
      type: "string",
      title: "Type",
      enum: FORM_FIELD_TYPES,
      default: "string",
    },
    title: {
      type: "string",
      title: "UI title",
    },
  },
};

export const editorFormSchema: Schema = {
  definitions: {
    Field: fieldSchema,
  },
  title: `Edit form`,
  properties: {
    title: {
      type: "string",
      title: "Form title",
    },
    fields: {
      type: "array",
      title: "Fields",
      items: {
        $ref: "#/definitions/Field",
      },
    },
  },
};
