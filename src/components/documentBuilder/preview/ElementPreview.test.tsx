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
import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";

const renderElementPreview = (
  element: DocumentElement,
  elementPreviewProps?: Partial<ElementPreviewProps>
) => {
  const props: ElementPreviewProps = {
    elementName: "element",
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

test("activates element on click", async () => {
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

test.each(DOCUMENT_ELEMENT_TYPES)(
  "can preview default %s",
  (elementType: DocumentElementType) => {
    const element = createNewElement(elementType);
    const rendered = renderElementPreview(element);
    expect(rendered.asFragment()).toMatchSnapshot();
  }
);
