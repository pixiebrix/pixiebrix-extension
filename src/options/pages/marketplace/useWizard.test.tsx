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
// import {extensionFactory, versionedExtensionPointRecipeFactory} from "@/tests/factories";
// import useWizard from "@/options/pages/marketplace/useWizard";
// import * as redux from "react-redux";

import React from "react";
import * as redux from "react-redux";
import { recipeDefinitionFactory } from "@/testUtils/factories";
import useWizard from "@/options/pages/marketplace/useWizard";
import { OptionsDefinition } from "@/types/definitions";
import { renderHook } from "@testing-library/react-hooks";

jest.mock("@/options/pages/marketplace/AuthWidget", () => {});
jest.mock("react-redux");
jest.mock("connected-react-router");

// describe("useWizard reinstall", () => {
//   test("prefills existing options", () => {
//     const blueprint = versionedExtensionPointRecipeFactory()({
//       options: {
//         schema: {
//           properties: {
//             textField: {
//               type: "string",
//             },
//             newField: {
//               type: "string",
//               default: "new field default",
//             }
//           }
//         },
//       }
//     });
//
//     (redux.useSelector as any).mockReturnValue([
//       extensionFactory({
//         optionsArgs: {
//           textField: "hello, world!",
//         }
//       }),
//     ])
//
//     const [, initialValues] = useWizard(blueprint);
//
//     expect(initialValues.optionsArgs).toStrictEqual({
//       textField: "hello, world!",
//       newField: "new field default",
//     });
//   });
// });

describe("useWizard", () => {
  test("show personalized tab", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useWizard(
        recipeDefinitionFactory({
          // Page Editor produces normalized form
          options: {
            schema: { properties: { foo: { type: "string" } } },
          } as OptionsDefinition,
        })
      )
    );

    const [steps] = result.current;
    expect(steps).toHaveLength(3);
  });

  test("hide personalized tab for empty schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useWizard(
        recipeDefinitionFactory({
          // Page Editor produces normalized form
          options: { schema: { properties: {} } } as OptionsDefinition,
        })
      )
    );

    const [steps] = result.current;
    expect(steps).toHaveLength(2);
  });

  test("hide personalized tab for empty shorthand schema", () => {
    const spy = jest.spyOn(redux, "useSelector");
    spy.mockReturnValue([]);

    const { result } = renderHook(() =>
      useWizard(
        recipeDefinitionFactory({
          // Shorthand manually written
          options: { schema: {} } as OptionsDefinition,
        })
      )
    );

    const [steps] = result.current;
    expect(steps).toHaveLength(2);
  });
});
