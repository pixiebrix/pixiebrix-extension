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

import React, { useState } from "react";
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import {
  type DocumentBuilderElement,
  type ListElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { fireEvent, screen } from "@testing-library/react";
import DocumentPreview from "@/pageEditor/documentBuilder/preview/DocumentPreview";
import userEvent from "@testing-library/user-event";
import { render } from "@/pageEditor/testHelpers";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { actions } from "@/pageEditor/slices/editorSlice";
import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import blockRegistry from "@/bricks/registry";
import { waitForEffect } from "@/testUtils/testHelpers";
import { type PipelineExpression } from "@/types/runtimeTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { toExpression } from "@/utils/expressionUtils";
import { uuidv4 } from "@/types/helpers";

function renderDocumentPreview(documentBuilderElement: DocumentBuilderElement) {
  const formState = formStateFactory(undefined, [
    {
      id: DocumentRenderer.BRICK_ID,
      config: {
        body: [documentBuilderElement],
      },
      instanceId: uuidv4(),
    },
  ]);

  const PreviewContainer = () => {
    const [activeElement, setActiveElement] = useState<string | null>(null);
    return (
      <DocumentPreview
        documentBodyName="modComponent.brickPipeline[0].config.body"
        activeElement={activeElement}
        setActiveElement={setActiveElement}
      />
    );
  };

  return render(<PreviewContainer />, {
    initialValues: formState,
    setupRedux(dispatch) {
      dispatch(actions.addModComponentFormState(formState));
      dispatch(actions.setActiveModComponentId(formState.uuid));
      dispatch(
        actions.setActiveNodeId(
          formState.modComponent.brickPipeline[0].instanceId,
        ),
      );
    },
  });
}

const documentBlock = new DocumentRenderer();
const temporaryDisplayBlock = new DisplayTemporaryInfo();

beforeAll(async () => {
  registerDefaultWidgets();
  blockRegistry.clear();
  blockRegistry.register([documentBlock, temporaryDisplayBlock]);
});

describe("Add new element", () => {
  // TODO: find a better way to access the elements so we can remove the linting exceptions
  test("Dropdown 'Add new element' stays open on hovering different elements", async () => {
    // Create a container with a list with a container inside
    const listElement = createNewDocumentBuilderElement("list") as ListElement;
    listElement.config.element.__value__ =
      createNewDocumentBuilderElement("container");
    const containerElement = createNewDocumentBuilderElement("container");
    // eslint-disable-next-line testing-library/no-node-access -- There's a row in the container and a column in the row.
    containerElement.children[0].children[0].children[0] = listElement;

    const { container } = renderDocumentPreview(containerElement);

    // Select a dropdown inside a Col in List and open it
    await userEvent.click(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
      container.querySelector(".col .col .addElement button"),
    );
    expect(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
      container.querySelector(".col .col .addElement button"),
    ).toHaveAttribute("aria-expanded", "true");

    // Hover over the Col in the list
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
    fireEvent.mouseOver(container.querySelector(".col .col"));
    expect(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
      container.querySelector(".col .col .addElement button"),
    ).toHaveAttribute("aria-expanded", "true");

    // Hover over the Container of the List, .root.root - is the Document root element
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
    fireEvent.mouseOver(container.querySelector(".root.root > .container"));
    expect(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
      container.querySelector(".col .col .addElement button"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("can add an element to a container", async () => {
    const { container } = renderDocumentPreview(
      createNewDocumentBuilderElement("container"),
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see test's TODO comment
    await userEvent.click(container.querySelector(".col .addElement button"));
    await userEvent.click(screen.getByText("Header", { selector: "a" }));

    const header = screen.getByRole("heading", { level: 1 });

    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("Header");
  });
});

describe("Show live preview", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function renderPreviewInTemporaryDisplayPipeline() {
    const containerElement = createNewDocumentBuilderElement("container");
    const formState = formStateFactory(undefined, [
      {
        id: DisplayTemporaryInfo.BRICK_ID,
        instanceId: uuidSequence(1),
        config: {
          title: toExpression("nunjucks", "Test Tab"),
          body: toExpression("pipeline", [
            {
              id: DocumentRenderer.BRICK_ID,
              instanceId: uuidSequence(2),
              config: {
                body: [containerElement],
              },
            },
          ]),
        },
      },
    ]);

    const PreviewContainer = () => {
      const [activeElement, setActiveElement] = useState<string | null>(null);
      return (
        <DocumentPreview
          documentBodyName="modComponent.brickPipeline[0].config.body.__value__[0].config.body"
          activeElement={activeElement}
          setActiveElement={setActiveElement}
        />
      );
    };

    const pipelineField = formState.modComponent.brickPipeline[0].config
      .body as PipelineExpression;

    return render(<PreviewContainer />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(actions.addModComponentFormState(formState));
        dispatch(actions.setActiveModComponentId(formState.uuid));
        dispatch(
          actions.setActiveNodeId(pipelineField.__value__[0].instanceId),
        );
      },
    });
  }

  test("it renders the button", async () => {
    renderPreviewInTemporaryDisplayPipeline();
    await waitForEffect();
    jest.runOnlyPendingTimers();
    expect(screen.getByText("Show Live Preview")).toBeInTheDocument();
  });
});
