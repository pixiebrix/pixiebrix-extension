/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
        description: "The first name of the person",
      },
      age: {
        type: "number",
        description: "The person's age",
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
        description: "A valid url",
      },
      email: {
        type: "string",
        format: "email",
        description: "The person's email",
      },
      uuid: {
        type: "string",
        format: "uuid",
      },
    },
  },
};

export const EnumType = Template.bind({});
EnumType.args = {
  schema: {
    type: "object",
    properties: {
      favorite_color: {
        type: "string",
        enum: ["red", "orange", "yellow", "green", "blue", "indigo", "violet"],
        description: "Your favorite color in the rainbow",
      },
    },
  },
};

export const MixedTypeEnumType = Template.bind({});
MixedTypeEnumType.args = {
  schema: {
    type: "object",
    properties: {
      favorite_thing: {
        type: ["string", "number"],
        enum: ["cookies", "rainbows", 42],
        description: "Your favorite color in the rainbow",
      },
    },
  },
};

export const MultipleTypeType = Template.bind({});
MultipleTypeType.args = {
  schema: {
    type: "object",
    properties: {
      text: {
        type: ["string", "number", "boolean"],
        description: "Body text description",
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
            deepArray: {
              type: "array",
              items: {
                type: "string",
              },
            },
            person: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The first name of the person",
                  },
                  age: {
                    type: "number",
                    description: "The person's age",
                  },
                },
              },
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
            description: "The first name of the person",
          },
          age: {
            type: "number",
            description: "The person's age",
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
