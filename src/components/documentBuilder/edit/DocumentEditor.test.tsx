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
import { Formik, useFormikContext } from "formik";
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
import { ServiceDependency } from "@/core";
import { FormState } from "@/pageEditor/pageEditorTypes";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("move element", () => {
  function renderDocumentEditor(
    documentElements: DocumentElement[],
    initialActiveElement: string = null
  ) {
    const document = {
      body: documentElements,
    };

    const PreviewContainer = () => {
      const [activeElement, setActiveElement] = useState<string | null>(
        initialActiveElement
      );
      return (
        <Formik initialValues={{ document }} onSubmit={jest.fn()}>
          <DocumentEditor
            name="document.body"
            activeElement={activeElement}
            setActiveElement={setActiveElement}
          />
        </Formik>
      );
    };

    return render(<PreviewContainer />);
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
  function renderDocumentEditor(
    formState: FormState,
    initialActiveElement: string = null
  ) {
    const formikStateRef = {
      current: formState,
    };

    const WrappedEditor = ({
      activeElement,
      setActiveElement,
    }: {
      activeElement: string;
      setActiveElement: (activeElement: string) => void;
    }) => {
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

    const PreviewContainer = () => {
      const [activeElement, setActiveElement] = useState<string | null>(
        initialActiveElement
      );
      return (
        <Formik initialValues={formState} onSubmit={jest.fn()}>
          <WrappedEditor
            activeElement={activeElement}
            setActiveElement={setActiveElement}
          />
        </Formik>
      );
    };

    const rendered = render(<PreviewContainer />);

    return {
      rendered,
      formikStateRef,
    };
  }

  test("removes service dependency", async () => {
    const services: ServiceDependency[] = [
      {
        id: "@test/service",
        outputKey: "serviceOutput",
        config: "6faefd8a-abf4-46b9-81d4-4205e8c03762",
      },
    ];

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
      instanceId: uuidSequence(1),
    };

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

    const { rendered, formikStateRef } = renderDocumentEditor(formState, "0");

    await userEvent.click(rendered.getByText("Remove element"));

    expect(formikStateRef.current.services).toStrictEqual([]);
  });
});
