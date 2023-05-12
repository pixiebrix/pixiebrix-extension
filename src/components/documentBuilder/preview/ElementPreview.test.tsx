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

import React from "react";
import {
  DOCUMENT_ELEMENT_TYPES,
  type DocumentElement,
  type DocumentElementType,
} from "@/components/documentBuilder/documentBuilderTypes";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import ElementPreview, {
  type ElementPreviewProps,
} from "@/components/documentBuilder/preview/ElementPreview";
import { fireEvent } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { defaultBlockConfig } from "@/blocks/util";
import { MarkdownRenderer } from "@/blocks/renderers/markdown";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { render } from "@/pageEditor/testHelpers";
import { actions } from "@/pageEditor/slices/editorSlice";
import userEvent from "@testing-library/user-event";
import {
  baseExtensionStateFactory,
  formStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { blockConfigFactory } from "@/testUtils/factories/blockFactories";

const renderElementPreview = (
  element: DocumentElement,
  elementPreviewProps?: Partial<ElementPreviewProps>
) => {
  const props: ElementPreviewProps = {
    documentBodyName: "",
    elementName: "element",
    previewElement: element,
    activeElement: null,
    setActiveElement: jest.fn(),
    hoveredElement: null,
    setHoveredElement: jest.fn(),
    ...elementPreviewProps,
  };

  const formState = formStateFactory({
    extension: baseExtensionStateFactory({
      blockPipeline: [
        blockConfigFactory({
          config: {
            body: [element],
          },
        }),
      ],
    }),
  });

  return render(<ElementPreview {...props} />, {
    initialValues: formState,
    setupRedux(dispatch) {
      dispatch(actions.addElement(formState));
      dispatch(actions.selectElement(formState.uuid));
      dispatch(
        actions.setElementActiveNodeId(
          formState.extension.blockPipeline[0].instanceId
        )
      );
      dispatch(actions.setNodePreviewActiveElement("0"));
    },
  });
};

test("calls setActiveElement callback on click", async () => {
  const setActiveElementMock = jest.fn();
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    setActiveElement: setActiveElementMock,
  });

  await act(async () => {
    fireEvent.click(container.querySelector("p"));
  });
  expect(setActiveElementMock).toHaveBeenCalledWith("element");
});

test("prevents navigation on link click", async () => {
  const consoleError = jest.spyOn(global.console, "error");

  const element = createNewElement("text");
  element.config.text = "Link in markdown [www.google.com](https://google.com)";
  const rendered = renderElementPreview(element, {
    setActiveElement: jest.fn(),
  });

  await userEvent.click(rendered.getByText("www.google.com"));
  expect(rendered.getByText("Link in markdown")).toBeInTheDocument();

  // On navigation jest calls console.error, fail the test if it is called
  expect(consoleError).not.toHaveBeenCalled();

  consoleError.mockRestore();
});

test("adds a CSS class to an active element", async () => {
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    activeElement: "element",
  });

  expect(container.querySelector("div")).toHaveClass("active");
});

test("calls setHoveredElement callback on hover", async () => {
  const setHoveredElementMock = jest.fn();
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    setHoveredElement: setHoveredElementMock,
  });

  await act(async () => {
    fireEvent.mouseOver(container.querySelector("p"));
  });
  expect(setHoveredElementMock).toHaveBeenCalledWith("element");
  setHoveredElementMock.mockClear();
});

test("calls setHoveredElement callback when mouse leaves", async () => {
  const setHoveredElementMock = jest.fn();
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    hoveredElement: "element",
    setHoveredElement: setHoveredElementMock,
  });

  await act(async () => {
    fireEvent.mouseLeave(container.querySelector("p"));
  });
  expect(setHoveredElementMock).toHaveBeenCalledWith(null);
});

test("adds a CSS class to a hovered element", async () => {
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    hoveredElement: "element",
  });

  expect(container.querySelector("div")).toHaveClass("hovered");
});

test.each(
  DOCUMENT_ELEMENT_TYPES.filter(
    (x) => !["header_1", "header_2", "header_3"].includes(x)
  )
)("can preview default %s", (elementType: DocumentElementType) => {
  const element = createNewElement(elementType);
  const rendered = renderElementPreview(element);
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("can preview pipeline element with bricks", () => {
  const testBlock = blockConfigFactory();
  const markdownBlock = new MarkdownRenderer();
  const markdownConfig = blockConfigFactory({
    id: markdownBlock.id,
    config: defaultBlockConfig(markdownBlock.inputSchema),
  });

  const element = createNewElement("pipeline");
  const pipeline = element.config.pipeline as PipelineExpression;
  pipeline.__value__.push(testBlock, markdownConfig);
  const rendered = renderElementPreview(element);

  expect(rendered.asFragment()).toMatchSnapshot();
});
