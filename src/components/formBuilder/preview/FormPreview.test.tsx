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

import { Schema, UiSchema } from "@/core";
import testItRenders, { ItRendersOptions } from "@/tests/testItRenders";
import { Except } from "type-fest";
import FormPreview, { FormPreviewProps } from "./FormPreview";

describe("FormPreview", () => {
  const defaultProps: Except<FormPreviewProps, "activeField"> = {
    rjsfSchema: { schema: {}, uiSchema: {} },
    setActiveField: jest.fn(),
  };

  testItRenders({
    isAsync: true,
    testName: "it renders empty schema",
    Component: FormPreview,
    props: defaultProps,
  });

  testItRenders(() => {
    const schema: Schema = {
      title: "A form",
      description: "A form example.",
      type: "object",
      properties: {
        firstName: {
          type: "string",
          title: "First name",
          default: "Chuck",
        },
        age: {
          type: "number",
          title: "Age",
        },
        telephone: {
          type: "string",
          title: "Telephone",
        },
      },
    };
    const uiSchema: UiSchema = {};

    const props: FormPreviewProps = {
      rjsfSchema: { schema, uiSchema },
      activeField: "firstName",
      setActiveField: defaultProps.setActiveField,
    };

    const options: ItRendersOptions<FormPreviewProps> = {
      isAsync: true,
      testName: "it renders simple schema",
      Component: FormPreview,
      props,
    };

    return options;
  });

  testItRenders({
    isAsync: true,
    testName: "it renders markdown in description",
    Component: FormPreview,
    props: {
      rjsfSchema: {
        schema: {
          title: "A form",
          description: "_Form description_",
          type: "object",
          properties: {
            firstName: {
              type: "string",
              title: "First name",
              description: "[link](https://example.com) in **description**",
            },
          },
        },
        uiSchema: {},
      },
      activeField: "firstName",
      setActiveField: defaultProps.setActiveField,
    },
  });
});
