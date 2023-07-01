/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import JQueryReaderOptions, {
  inferActiveTypeOption,
  typeOptionsFactory,
} from "@/blocks/transformers/jquery/JQueryReaderOptions";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
// eslint-disable-next-line no-restricted-imports -- using to simplify Formik state for test
import { Formik } from "formik";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { JQueryReader } from "@/blocks/transformers/jquery/JQueryReader";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import { makeVariableExpression } from "@/runtime/expressionCreators";

function baseStateFactory() {
  const baseFormState = menuItemFormStateFactory();
  baseFormState.extension.blockPipeline = [
    {
      id: JQueryReader.BRICK_ID,
      config: {
        selectors: {},
      },
    },
  ];
  return baseFormState;
}

function renderOptions(formState: FormState = baseStateFactory()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <JQueryReaderOptions
        name="extension.blockPipeline.0"
        configKey="config"
      />
    </Formik>
  );
}

beforeAll(() => {
  registerDefaultWidgets();
});

describe("JQueryReaderOptions", () => {
  it("renders empty config without crashing", () => {
    const wrapper = renderOptions();
    expect(wrapper.getByText("Add New Property")).toBeInTheDocument();
  });

  it("shows workshop message on variable selector", async () => {
    const state = baseStateFactory();
    state.extension.blockPipeline[0].config.selectors = {
      property: makeVariableExpression("@foo"),
    };

    const wrapper = renderOptions(state);

    await waitForEffect();

    expect(wrapper.queryByText("Add New Property")).not.toBeInTheDocument();
    expect(wrapper.container.querySelector(".alert")).toBeInTheDocument();
  });

  it("shows workshop message variable selectors", async () => {
    const state = baseStateFactory();
    state.extension.blockPipeline[0].config.selectors =
      makeVariableExpression("@foo");

    const wrapper = renderOptions(state);

    await waitForEffect();

    expect(wrapper.queryByText("Add New Property")).not.toBeInTheDocument();
    expect(wrapper.container.querySelector(".alert")).toBeInTheDocument();
  });

  it("normalizes primitive selectors", async () => {
    const state = baseStateFactory();
    state.extension.blockPipeline[0].config.selectors = { property: "h1" };

    const wrapper = renderOptions(state);

    await waitForEffect();

    expect(wrapper.getByPlaceholderText("Property name")).toHaveValue(
      "property"
    );

    expect(wrapper.getByLabelText("Selector")).toHaveValue("h1");
  });
});

describe("type options", () => {
  it("infers element", () => {
    expect(
      inferActiveTypeOption({
        selector: "div",
        find: {},
      })
    ).toEqual("element");
  });

  it("infers attribute", () => {
    expect(
      inferActiveTypeOption({
        selector: "div",
        attr: "foo",
      })
    ).toEqual("attr:foo");
  });

  it("infers data attribute", () => {
    expect(
      inferActiveTypeOption({
        selector: "div",
        data: "foo",
      })
    ).toEqual("attr:data-foo");
  });

  it("creates new option for unknown type", () => {
    expect(typeOptionsFactory([], "attr:data-foo")).toEqual([
      { label: "Text", value: "text" },
      { label: "Element", value: "element" },
      { label: "data-foo", value: "attr:data-foo" },
    ]);
  });

  it("matches data attribute", () => {
    expect(
      typeOptionsFactory([{ name: "data-foo", value: "abc" }], "attr:data-foo")
    ).toEqual([
      { label: "Text", value: "text" },
      { label: "Element", value: "element" },
      { label: "data-foo - abc", value: "attr:data-foo" },
    ]);
  });
});
