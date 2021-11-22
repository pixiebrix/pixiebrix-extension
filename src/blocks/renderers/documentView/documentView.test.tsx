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

import { loadBrickYaml } from "@/runtime/brickYaml";
import { waitForEffect } from "@/tests/testHelpers";
import { render } from "@testing-library/react";
import { getComponent } from "./documentView";
import React from "react";
import blockRegistry from "@/blocks/registry";
import { MarkdownRenderer } from "@/blocks/renderers/markdown";

// Mock the recordX trace methods. Otherwise they'll fail and Jest will have unhandledrejection errors since we call
// them with `void` instead of awaiting them in the reducePipeline methods
import * as logging from "@/background/logging";
import * as backgroundAPI from "@/background/messenger/api";
import * as contentScriptAPI from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
jest.mock("@/contentScript/messenger/api");
jest.mock("@/background/messenger/api");
jest.mock("@/background/trace");
(logging.getLoggingConfig as any) = jest.fn().mockResolvedValue({
  logValues: true,
});

const markdownBlock = new MarkdownRenderer();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(markdownBlock);
});

const renderDocument = (config: any) => {
  const { Component, props } = getComponent(config);
  return render(<Component {...props} />);
};

test.each`
  type          | tagName
  ${"header_1"} | ${"h1"}
  ${"header_2"} | ${"h2"}
  ${"header_3"} | ${"h3"}
`(
  "renders $tagName for $type",
  ({ type, tagName }: { type: string; tagName: string }) => {
    const config = {
      type,
      config: {
        title: "Test Header",
        className: "test-class",
      },
    };
    const { container } = renderDocument(config);

    const element = container.querySelector(tagName);

    expect(element).not.toBeNull();
    expect(element).toHaveClass("test-class");
    expect(element).toHaveTextContent("Test Header");
  }
);

test("renders paragraph text", () => {
  const config = {
    type: "text",
    config: {
      text: "Test Paragraph",
      className: "test-class",
    },
  };
  const { container } = renderDocument(config);

  const element = container.querySelector("p");

  expect(element).not.toBeNull();
  expect(element).toHaveClass("test-class");
  expect(element).toHaveTextContent("Test Paragraph");
});

test("renders unknown type", () => {
  const config = {
    type: "TheTypeForWhichAComponentIsNotDefined",
    className: "test-class",
  };
  const { container } = renderDocument(config);

  const element = container.querySelector("span");

  expect(element).not.toBeNull();
  expect(element).toHaveTextContent(
    "Unknown type: TheTypeForWhichAComponentIsNotDefined"
  );
});

test("renders grid", () => {
  const config = {
    type: "container",
    config: {
      className: "text-primary",
    },
    children: [
      {
        type: "row",
        children: [
          {
            type: "column",
            children: [
              {
                type: "header_1",
                config: {
                  title: "Header",
                },
              },
            ],
          },
        ],
      },
      {
        type: "row",
        config: {
          className: "mt-5",
        },
        children: [
          {
            type: "column",
            config: {
              className: "p-3",
            },
            children: [
              {
                type: "text",
                config: {
                  text: "left column",
                },
              },
            ],
          },
          {
            type: "column",
            config: {
              className: "p-5",
            },
            children: [
              {
                type: "text",
                config: {
                  text: "right column",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const rendered = renderDocument(config);
  expect(rendered.asFragment()).toMatchSnapshot();
});

describe("button", () => {
  test("renders button", () => {
    const config = {
      type: "button",
      config: {
        title: "Button under test",
        variant: "primary",
        className: "test-class",
        onClick: {
          __type__: "pipeline",
          __value__: jest.fn(),
        },
      },
    };
    const { container } = renderDocument(config);
    const element = container.querySelector("button");

    expect(element).not.toBeNull();
    expect(element).toHaveClass("test-class");
    expect(element).toHaveTextContent("Button under test");
  });

  test.each`
    variant        | className
    ${"primary"}   | ${"btn-primary"}
    ${"secondary"} | ${"btn-secondary"}
    ${"link"}      | ${"btn-link"}
  `("applies button variant: $variant", ({ variant, className }) => {
    const config = {
      type: "button",
      config: {
        title: "Button under test",
        variant,
        onClick: {
          __type__: "pipeline",
          __value__: jest.fn(),
        },
      },
    };
    const { container } = renderDocument(config);
    const element = container.querySelector("button");

    expect(element).toHaveClass(className);
  });
});

describe("card", () => {
  test("renders text body", () => {
    const config = {
      type: "card",
      config: {
        className: "test-class",
        heading: "Test Heading of Card",
        body: "Test body of card",
      },
    };
    const rendered = renderDocument(config);
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("renders pipeline body", async () => {
    const markdown = "Pipeline text for card test.";
    (backgroundAPI.whoAmI as any).mockResolvedValue({ tab: { id: 0 } });
    (contentScriptAPI.runRendererPipeline as any).mockResolvedValue({
      blockId: markdownBlock.id,
      key: uuidv4(),
      args: { markdown },
      ctxt: { "@input": {}, "@options": {} },
    });

    const yamlConfig = `
type: card
config:
  className: test-class
  heading: Test Heading of Card
  body: !pipeline
    - id: "${markdownBlock.id}"
      config:
        markdown: ${markdown}`;
    const config = loadBrickYaml(yamlConfig);
    const rendered = renderDocument(config);

    // Wait for useAsyncState inside of PipelineComponent
    await waitForEffect();

    // The className is applied to the card element
    expect(
      rendered.container.querySelector(".card.test-class .card-header")
    ).toHaveTextContent("Test Heading of Card");

    // We can't query by the text because PipelineComponent -> PanelBody wraps it in a shadow dom. If we want to
    // test against the shadow DOM, we could either: 1) mock react-shadow-dom to not use the shadow dom, or 2) use
    // a library like https://www.npmjs.com/package/testing-library__dom
    expect(
      rendered.container.querySelector(`[data-block-id="${markdownBlock.id}"]`)
    ).not.toBeNull();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
