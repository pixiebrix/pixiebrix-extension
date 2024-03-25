import React from "react";
import { render, screen } from "@testing-library/react";
import ShortcutSnippetMenu from "@/contentScript/shortcutSnippetMenu/ShortcutSnippetMenu";
import SnippetRegistry from "@/contentScript/shortcutSnippetMenu/ShortcutSnippetRegistry";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";

// I couldn't get shadow-dom-testing-library working
jest.mock("react-shadow/emotion", () => ({
  __esModule: true,
  default: {
    div(props: any) {
      return <div {...props}></div>;
    },
  },
}));

describe("Shortcut Snippet Menu", () => {
  it("renders search result", async () => {
    const registry = new SnippetRegistry();

    registry.register({
      componentId: autoUUIDSequence(),
      title: "Test",
      shortcut: "foo",
      preview: "foobar",
      handler: jest.fn(),
    });

    document.body.innerHTML = '<input type="text" value="\\f" id="input" />';

    const element: HTMLInputElement = screen.getByRole("textbox");

    render(
      <ShortcutSnippetMenu
        commandKey="\\"
        registry={registry}
        element={element}
        onHide={jest.fn()}
      />,
    );

    expect(
      screen.queryByText("We couldn't find any matching snippets"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem")).toBeInTheDocument();
  });

  it("renders no matches message for empty state", async () => {
    const registry = new SnippetRegistry();
    document.body.innerHTML = '<input type="text" value="\\" id="input" />';

    const element: HTMLInputElement = screen.getByRole("textbox");

    render(
      <ShortcutSnippetMenu
        commandKey="\\"
        registry={registry}
        element={element}
        onHide={jest.fn()}
      />,
    );

    await expect(
      screen.findByText("We couldn't find any matching snippets"),
    ).resolves.toBeInTheDocument();
  });
});
