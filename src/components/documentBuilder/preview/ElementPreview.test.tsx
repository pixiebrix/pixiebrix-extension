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
import {
  DOCUMENT_ELEMENT_TYPES,
  DocumentElement,
  DocumentElementType,
} from "@/components/documentBuilder/documentBuilderTypes";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { Formik } from "formik";
import ElementPreview, {
  ElementPreviewProps,
} from "@/components/documentBuilder/preview/ElementPreview";
import { fireEvent, render } from "@testing-library/react";
import { act } from "react-dom/test-utils";

const renderElementPreview = (
  element: DocumentElement,
  elementPreviewProps?: Partial<ElementPreviewProps>
) => {
  const props: ElementPreviewProps = {
    name: "",
    elementName: "element",
    previewElement: element,
    activeElement: null,
    setActiveElement: jest.fn(),
    hoveredElement: null,
    setHoveredElement: jest.fn(),
    ...elementPreviewProps,
  };

  return render(
    <Formik
      initialValues={{
        element,
      }}
      onSubmit={jest.fn()}
    >
      <ElementPreview {...props} />
    </Formik>
  );
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

test("adds a CSS class to an active element", async () => {
  const element = createNewElement("text");
  const { container } = renderElementPreview(element, {
    activeElement: "element",
  });

  expect(container.querySelector("p")).toHaveClass("active");
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

  expect(container.querySelector("p")).toHaveClass("hovered");
});

test.each(DOCUMENT_ELEMENT_TYPES)(
  "can preview default %s",
  (elementType: DocumentElementType) => {
    const element = createNewElement(elementType);
    const rendered = renderElementPreview(element);
    expect(rendered.asFragment()).toMatchSnapshot();
  }
);
