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

import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import SchemaTree from "@/components/schemaTree/SchemaTree";

export default {
  title: "Components/SchemaTree",
  component: SchemaTree,
} as ComponentMeta<typeof SchemaTree>;

const Template: ComponentStory<typeof SchemaTree> = (args) => (
  <SchemaTree {...args} />
);

export const NoSchema = Template.bind({});
NoSchema.args = {
  schema: null,
};

export const NonObject = Template.bind({});
NonObject.args = {
  schema: {
    type: "string",
  },
};

export const Primitives = Template.bind({});
Primitives.args = {
  schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
      },
      age: {
        type: "number",
      },
    },
  },
};

export const StringFormats = Template.bind({});
// https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
StringFormats.args = {
  schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        format: "uri",
      },
      email: {
        type: "string",
        format: "email",
      },
      uuid: {
        type: "string",
        format: "uuid",
      },
    },
  },
};

export const Arrays = Template.bind({});
Arrays.args = {
  schema: {
    type: "object",
    properties: {
      myArray: {
        type: "array",
        items: {
          type: "string",
        },
      },
      anotherArray: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            age: {
              type: "number",
            },
          },
        },
      },
    },
  },
};

export const NestedObject = Template.bind({});
NestedObject.args = {
  schema: {
    type: "object",
    properties: {
      myObject: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          age: {
            type: "number",
          },
        },
      },
    },
  },
};

export const OneOf = Template.bind({});
OneOf.args = {
  schema: {
    type: "object",
    properties: {
      vehicle: {
        description:
          "A conveyance designed to carry an operator, passengers and/or cargo, over land.",
        oneOf: [
          {
            type: "string",
          },
          {
            type: "array",
            items: {
              type: "string",
            },
          },
        ],
      },
    },
  },
};
