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
import { createNewDocumentBuilderElement } from "@/pageEditor/documentBuilder/createNewDocumentBuilderElement";
import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { validateRegistryId } from "@/types/helpers";
import { render, screen } from "@/pageEditor/testHelpers";
import { actions } from "@/pageEditor/slices/editorSlice";
import { type IntegrationDependency } from "@/integrations/integrationTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  baseModComponentStateFactory,
  formStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { within } from "@testing-library/react";
import DocumentOptions from "@/pageEditor/documentBuilder/edit/DocumentOptions";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("DocumentOptions", () => {
  function basicFormState(
    documentElements: DocumentBuilderElement[],
    stylesheets: string[] = [],
  ): ModComponentFormState {
    return formStateFactory({
      extension: baseModComponentStateFactory({
        blockPipeline: [
          brickConfigFactory({
            config: {
              body: documentElements,
              stylesheets,
            },
          }),
        ],
      }),
    });
  }

  function renderDocumentOptions(
    formState: ModComponentFormState,
    initialActiveElement: string = null,
  ) {
    return render(
      <DocumentOptions name="extension.blockPipeline.0" configKey="config" />,
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(actions.addModComponentFormState(formState));
          dispatch(actions.setActiveModComponentId(formState.uuid));
          dispatch(
            actions.setActiveNodeId(
              formState.extension.blockPipeline[0].instanceId,
            ),
          );
          dispatch(
            actions.setActiveDocumentOrFormPreviewElement(initialActiveElement),
          );
        },
      },
    );
  }

  describe("move element", () => {
    test("can move text element down", async () => {
      const documentElements = [
        createNewDocumentBuilderElement("text"),
        createNewDocumentBuilderElement("text"),
      ];
      documentElements[0].config.text = "test text 1";
      documentElements[1].config.text = "test text 2";
      renderDocumentOptions(basicFormState(documentElements), "0");

      // The first text element is active
      expect(screen.getByText("test text 1")).toBeInTheDocument();

      await userEvent.click(
        screen.getByText("Move down", { selector: "button" }),
      );

      // The element is still active
      expect(screen.getByText("test text 1")).toBeInTheDocument();

      // Now can move the element up
      expect(
        screen.getByText("Move up", { selector: "button" }),
      ).not.toBeDisabled();

      // Can't move it further down
      expect(
        screen.getByText("Move down", { selector: "button" }),
      ).toBeDisabled();
    });

    test("can move text element up", async () => {
      const documentElements = [
        createNewDocumentBuilderElement("text"),
        createNewDocumentBuilderElement("text"),
      ];
      documentElements[0].config.text = "test text 1";
      documentElements[1].config.text = "test text 2";
      renderDocumentOptions(basicFormState(documentElements), "1");

      // The second text element is active
      expect(screen.getByText("test text 2")).toBeInTheDocument();

      await userEvent.click(
        screen.getByText("Move up", { selector: "button" }),
      );

      // The element is still active
      expect(screen.getByText("test text 2")).toBeInTheDocument();

      // Can't move the element up
      expect(
        screen.getByText("Move up", { selector: "button" }),
      ).toBeDisabled();

      // Can move it down
      expect(
        screen.getByText("Move down", { selector: "button" }),
      ).not.toBeDisabled();
    });
  });

  describe("remove current element", () => {
    test("removes integration dependency", async () => {
      // Integration dependencies included in the form state
      const integrationDependencies: IntegrationDependency[] = [
        integrationDependencyFactory({
          integrationId: validateRegistryId("@test/service"),
          outputKey: validateOutputKey("serviceOutput"),
          configId: uuidSequence,
        }),
      ];

      // Document brick definition
      const documentWithButtonConfig = {
        body: [
          {
            type: "button",
            config: {
              title: "Action",
              onClick: toExpression("pipeline", [
                {
                  id: validateRegistryId("@test/action"),
                  instanceId: uuidSequence(2),
                  config: {
                    input: toExpression("var", "@serviceOutput"),
                  },
                },
              ]),
            },
          },
        ],
      };

      // Form state for the test
      const formState = formStateFactory({
        integrationDependencies,
        extension: baseModComponentStateFactory({
          blockPipeline: [
            brickConfigFactory({ config: documentWithButtonConfig }),
          ],
        }),
      });

      const { getFormState } = renderDocumentOptions(formState, "0");

      await userEvent.click(screen.getByText("Remove current element"));

      expect(getFormState().integrationDependencies).toStrictEqual([]);
    });
  });

  describe("stylesheets field", () => {
    test("renders correctly", async () => {
      const documentElements = [
        createNewDocumentBuilderElement("text"),
        createNewDocumentBuilderElement("text"),
      ];
      documentElements[0].config.text = "test text 1";
      documentElements[1].config.text = "test text 2";
      const { getFormState } = renderDocumentOptions(
        basicFormState(documentElements),
        "0",
      );

      const themeToggle = await screen.findByText("Advanced: Theme");

      await userEvent.click(themeToggle);

      const stylesheetsLabel = await screen.findByText("CSS Stylesheet URLs");
      // eslint-disable-next-line testing-library/no-node-access -- ArrayWidget is hard to use with jest
      const stylesheetsFieldContainer = stylesheetsLabel.parentElement;

      // Add a stylesheet
      const addItemButton = await within(stylesheetsFieldContainer).findByText(
        "Add Item",
      );
      await userEvent.click(addItemButton);

      const urlInput = within(stylesheetsFieldContainer).getByRole("textbox");
      await userEvent.type(urlInput, "https://example.com/stylesheet.css");

      // The form state should be updated
      expect(
        getFormState().extension.blockPipeline[0].config.stylesheets,
      ).toStrictEqual([
        toExpression("nunjucks", "https://example.com/stylesheet.css"),
      ]);
    }, 10_000); // Increase to 10 seconds, the stylesheets test can time out on CI with 5 secondsg
  });
});
