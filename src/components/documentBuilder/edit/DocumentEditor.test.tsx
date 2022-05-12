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

import { render } from "@testing-library/react";
import React, { useState } from "react";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import DocumentEditor from "./DocumentEditor";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { createFormikTemplate } from "@/testUtils/formHelpers";

function renderDocumentEditor(
  documentElements: DocumentElement[],
  initialActiveElement: string = null
) {
  const FormikTemplate = createFormikTemplate({
    document: {
      body: documentElements,
    },
  });

  const DocumentEditorContainer = () => {
    const [activeElement, setActiveElement] = useState<string | null>(
      initialActiveElement
    );
    return (
      <DocumentEditor
        name="document.body"
        activeElement={activeElement}
        setActiveElement={setActiveElement}
      />
    );
  };

  return render(
    <FormikTemplate>
      <DocumentEditorContainer />
    </FormikTemplate>
  );
}

beforeAll(() => {
  registerDefaultWidgets();
});

describe("move element", () => {
  test("can move text element down", async () => {
    const documentElements = [
      createNewElement("text"),
      createNewElement("text"),
    ];
    documentElements[0].config.text = "test text 1";
    documentElements[1].config.text = "test text 2";
    const rendered = renderDocumentEditor(documentElements, "0");

    await userEvent.click(
      rendered.getByText("Move down", { selector: "button" })
    );

    // The element is still active
    expect(rendered.getByText("test text 1")).toBeInTheDocument();

    // Now can move the element up
    expect(
      rendered.getByText("Move up", { selector: "button" })
    ).not.toBeDisabled();

    // Can't move it further down
    expect(
      rendered.getByText("Move down", { selector: "button" })
    ).toBeDisabled();
  });
  test("can move text element up", async () => {
    const documentElements = [
      createNewElement("text"),
      createNewElement("text"),
    ];
    documentElements[0].config.text = "test text 1";
    documentElements[1].config.text = "test text 2";
    const rendered = renderDocumentEditor(documentElements, "1");

    await userEvent.click(
      rendered.getByText("Move up", { selector: "button" })
    );

    // The element is still active
    expect(rendered.getByText("test text 2")).toBeInTheDocument();

    // Can't move the element up
    expect(
      rendered.getByText("Move up", { selector: "button" })
    ).toBeDisabled();

    // Can move it down
    expect(
      rendered.getByText("Move down", { selector: "button" })
    ).not.toBeDisabled();
  });
});
