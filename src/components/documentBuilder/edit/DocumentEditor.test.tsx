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
import { useFormikContext } from "formik";
import React, { useState } from "react";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import DocumentEditor from "./DocumentEditor";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import {
  blockConfigFactory,
  formStateFactory,
  uuidSequence,
  baseExtensionStateFactory,
} from "@/testUtils/factories";
import { toExpression } from "@/testUtils/testHelpers";
import { OutputKey, ServiceDependency } from "@/core";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { validateRegistryId } from "@/types/helpers";
import { createFormikTemplate } from "@/testUtils/formHelpers";

jest.mock("@/blocks/registry");

beforeAll(() => {
  registerDefaultWidgets();
});

describe("move element", () => {
  function renderDocumentEditor(
    documentElements: DocumentElement[],
    initialActiveElement: string = null
  ) {
    const DocumentEditorContainer = () => {
      const [activeElement, setActiveElement] = useState<string | null>(
        initialActiveElement
      );
      return (
        <DocumentEditor
          name="documentElements"
          activeElement={activeElement}
          setActiveElement={setActiveElement}
        />
      );
    };

    const FormikTemplate = createFormikTemplate({
      documentElements,
    });

    return render(
      <FormikTemplate>
        <DocumentEditorContainer />
      </FormikTemplate>
    );
  }

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

describe("remove element", () => {
  /**
   * Renders the DocumentEditor inside Formik context.
   * @returns Rendered result and reference to the current Formik state.
   */
  function renderDocumentEditorWithFormState(
    formState: FormState,
    initialActiveElement: string = null
  ) {
    const formikStateRef = {
      current: formState,
    };

    const WrappedEditor = () => {
      const [activeElement, setActiveElement] = useState<string | null>(
        initialActiveElement
      );

      const { values } = useFormikContext<FormState>();
      formikStateRef.current = values;

      return (
        <DocumentEditor
          name="extension.blockPipeline.0.config.config.body"
          activeElement={activeElement}
          setActiveElement={setActiveElement}
        />
      );
    };

    const FormikTemplate = createFormikTemplate(formState);

    const rendered = render(
      <FormikTemplate>
        <WrappedEditor />
      </FormikTemplate>
    );

    return {
      rendered,
      formikStateRef,
    };
  }

  test("removes service dependency", async () => {
    // Services included in the form state
    const services: ServiceDependency[] = [
      {
        id: validateRegistryId("@test/service"),
        outputKey: "serviceOutput" as OutputKey,
        config: uuidSequence(1),
      },
    ];

    // Document brick definition
    const documentWithButtonConfig = {
      id: "@test/document",
      config: {
        body: [
          {
            type: "button",
            config: {
              title: "Action",
              onClick: toExpression("pipeline", [
                {
                  id: "@test/action",
                  instanceId: uuidSequence(2),
                  config: {
                    input: toExpression("var", "@serviceOutput"),
                  },
                },
              ]),
            },
          },
        ],
      },
      instanceId: uuidSequence(3),
    };

    // Form state for the test
    const formState = formStateFactory({
      services,
      extension: baseExtensionStateFactory({
        blockPipeline: [
          blockConfigFactory({
            config: documentWithButtonConfig,
          }),
        ],
      }),
    });

    const { rendered, formikStateRef } = renderDocumentEditorWithFormState(
      formState,
      "0"
    );

    await userEvent.click(rendered.getByText("Remove element"));

    expect(formikStateRef.current.services).toStrictEqual([]);
  });
});
