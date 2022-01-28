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

import React, { useState } from "react";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { ListDocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { fireEvent, render } from "@testing-library/react";
import DocumentPreview from "@/components/documentBuilder/preview/DocumentPreview";
import { Formik } from "formik";
import { act } from "react-dom/test-utils";

test("Dropdown 'Add new element' stays open on hovering different elements", async () => {
  // Create a container with a list with a container inside
  const listElement = createNewElement("list") as ListDocumentElement;
  listElement.config.element.__value__ = createNewElement("container");
  const containerElement = createNewElement("container");
  // There's a row in the container and a column in the row.
  containerElement.children[0].children[0].children[0] = listElement;
  const document = {
    body: [containerElement],
  };

  const PreviewContainer = () => {
    const [activeElement, setActiveElement] = useState<string | null>(null);
    return (
      <Formik
        initialValues={{
          document,
        }}
        onSubmit={jest.fn()}
      >
        <DocumentPreview
          name="document.body"
          activeElement={activeElement}
          setActiveElement={setActiveElement}
        />
      </Formik>
    );
  };

  const rendered = render(<PreviewContainer />);
  const { container } = rendered;

  // Select a dropdown inside a Col in List and open it
  await act(async () => {
    fireEvent.click(container.querySelector(".col .col .addElement button"));
  });
  expect(
    container.querySelector(".col .col .addElement button")
  ).toHaveAttribute("aria-expanded", "true");

  // Hover over the Col in the list
  fireEvent.mouseOver(container.querySelector(".col .col"));
  expect(
    container.querySelector(".col .col .addElement button")
  ).toHaveAttribute("aria-expanded", "true");

  // Hover over the Container of the List, .root.root - is the Document root element
  fireEvent.mouseOver(container.querySelector(".root.root > .container"));
  expect(
    container.querySelector(".col .col .addElement button")
  ).toHaveAttribute("aria-expanded", "true");
});
