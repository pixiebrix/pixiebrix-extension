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
import {
  DOCUMENT_BUILDER_ELEMENT_TYPES,
  type DocumentBuilderElement,
  type DocumentBuilderElementType,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import ElementPreview, {
  type ElementPreviewProps,
} from "@/pageEditor/documentBuilder/preview/ElementPreview";
import { fireEvent, screen } from "@testing-library/react";
import { defaultBrickConfig } from "@/bricks/util";
import MarkdownRenderer from "@/bricks/renderers/MarkdownRenderer";
import { type PipelineExpression } from "@/types/runtimeTypes";
import { render } from "@/pageEditor/testHelpers";
import { actions } from "@/pageEditor/slices/editorSlice";
import userEvent from "@testing-library/user-event";
import {
  baseModComponentStateFactory,
  formStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { validateRegistryId } from "@/types/helpers";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const renderElementPreview = (
  element: DocumentBuilderElement,
  elementPreviewProps?: Partial<ElementPreviewProps>,
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
    modComponent: baseModComponentStateFactory({
      brickPipeline: [
        brickConfigFactory({
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
      dispatch(actions.addModComponentFormState(formState));
      dispatch(actions.setActiveModComponentId(formState.uuid));
      dispatch(
        actions.setActiveNodeId(
          formState.modComponent.brickPipeline[0].instanceId,
        ),
      );
      dispatch(actions.setActiveBuilderPreviewElement("0"));
    },
  });
};

test("calls setActiveElement callback on click", async () => {
  const setActiveElementMock = jest.fn();
  const textElement = createNewDocumentBuilderElement("text");
  renderElementPreview(textElement, {
    setActiveElement: setActiveElementMock,
  });

  await userEvent.click(screen.getByText(/paragraph text/i));
  expect(setActiveElementMock).toHaveBeenCalledWith("element");
});

test("prevents navigation on link click", async () => {
  const consoleError = jest.spyOn(global.console, "error");

  const textElement = createNewDocumentBuilderElement("text");
  textElement.config.text =
    "Link in markdown [www.google.com](https://google.com)";
  renderElementPreview(textElement, {
    setActiveElement: jest.fn(),
  });

  await userEvent.click(screen.getByText("www.google.com"));
  expect(screen.getByText("Link in markdown")).toBeInTheDocument();

  // On navigation jest calls console.error, fail the test if it is called
  expect(consoleError).not.toHaveBeenCalled();

  consoleError.mockRestore();
});

test("adds a CSS class to an active element", async () => {
  const textElement = createNewDocumentBuilderElement("text");
  const { container } = renderElementPreview(textElement, {
    activeElement: "element",
  });

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- need to find better way to access this div
  expect(container.querySelector("div")).toHaveClass("active");
  expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
});

test("calls setHoveredElement callback on hover", async () => {
  const setHoveredElementMock = jest.fn();
  const textElement = createNewDocumentBuilderElement("text");
  renderElementPreview(textElement, {
    setHoveredElement: setHoveredElementMock,
  });

  await userEvent.click(screen.getByText(/paragraph text/i));

  expect(setHoveredElementMock).toHaveBeenCalledWith("element");
  setHoveredElementMock.mockClear();
});

test("calls setHoveredElement callback when mouse leaves", async () => {
  const setHoveredElementMock = jest.fn();
  const textElement = createNewDocumentBuilderElement("text");
  renderElementPreview(textElement, {
    hoveredElement: "element",
    setHoveredElement: setHoveredElementMock,
  });

  fireEvent.mouseLeave(screen.getByText(/paragraph text/i));
  expect(setHoveredElementMock).toHaveBeenCalledWith(null);
});

test("adds a CSS class to a hovered element", async () => {
  const textElement = createNewDocumentBuilderElement("text");
  const { container } = renderElementPreview(textElement, {
    hoveredElement: "element",
  });

  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- need to find better way to access this div
  expect(container.querySelector("div")).toHaveClass("hovered");
});

test.each(
  DOCUMENT_BUILDER_ELEMENT_TYPES.filter(
    (x) => !["header_1", "header_2", "header_3"].includes(x),
  ),
)("can preview default %s", (elementType: DocumentBuilderElementType) => {
  const element = createNewDocumentBuilderElement(elementType);
  const { asFragment } = renderElementPreview(element);
  expect(asFragment()).toMatchSnapshot();
});

test("can preview pipeline element with bricks", () => {
  const testBrick = brickConfigFactory({
    // Consistent registry id for snapshot testing
    id: validateRegistryId("test/brick"),
  });
  const markdownBlock = new MarkdownRenderer();
  const markdownConfig = brickConfigFactory({
    id: markdownBlock.id,
    config: defaultBrickConfig(markdownBlock.inputSchema),
  });

  const pipelineElement = createNewDocumentBuilderElement("pipeline");
  const pipeline = pipelineElement.config.pipeline as PipelineExpression;
  pipeline.__value__.push(testBrick, markdownConfig);
  const { asFragment } = renderElementPreview(pipelineElement);

  expect(asFragment()).toMatchSnapshot();
});
