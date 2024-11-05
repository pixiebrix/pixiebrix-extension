import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RichTextEditor from "./RichTextEditor";

describe("RichTextEditor", () => {
  const user = userEvent.setup();

  test("applies bold formatting using toolbar button", async () => {
    render(<RichTextEditor content="Hello World" />);

    const editor = screen.getByRole("textbox");
    await user.tripleClick(editor); // Select all text

    const boldButton = screen.getByRole("button", { name: "Bold" });
    await user.click(boldButton);

    const editorElement = screen.getByRole("textbox");
    expect(editorElement?.innerHTML).toBe(
      "<p><strong>Hello World</strong></p>",
    );
  });

  test("applies italic formatting using toolbar button", async () => {
    render(<RichTextEditor content="Hello World" />);

    const editor = screen.getByRole("textbox");
    await user.tripleClick(editor); // Select all text

    const italicButton = screen.getByRole("button", { name: "Italic" });
    await user.click(italicButton);

    const editorElement = screen.getByRole("textbox");
    expect(editorElement?.innerHTML).toBe("<p><em>Hello World</em></p>");
  });

  test("applies both bold and italic formatting", async () => {
    render(<RichTextEditor content="Hello World" />);

    const editor = screen.getByRole("textbox");
    await user.tripleClick(editor); // Select all text

    const boldButton = screen.getByRole("button", { name: "Bold" });
    const italicButton = screen.getByRole("button", { name: "Italic" });

    await user.click(boldButton);
    await user.click(italicButton);

    const editorElement = screen.getByRole("textbox");
    expect(editorElement?.innerHTML).toBe(
      "<p><strong><em>Hello World</em></strong></p>",
    );
  });

  describe("heading levels", () => {
    test.each([1, 2, 3, 4, 5, 6])(
      "applies heading level %i using dropdown",
      async (level) => {
        render(<RichTextEditor content="Hello World" />);

        const editor = screen.getByRole("textbox");
        await user.tripleClick(editor); // Select all text

        const dropdown = screen.getByRole("combobox", {
          name: "Heading Level",
        });
        await user.click(dropdown);
        await user.click(screen.getByText(`Heading ${level}`));

        const editorElement = screen.getByRole("textbox");
        expect(editorElement?.innerHTML).toBe(
          `<h${level}>Hello World</h${level}>`,
        );
      },
    );

    test("converts heading back to paragraph text", async () => {
      render(<RichTextEditor content="<h1>Hello World</h1>" />);

      const editor = screen.getByRole("textbox");
      await user.tripleClick(editor); // Select all text

      const dropdown = screen.getByRole("combobox", { name: "Heading Level" });
      await user.click(dropdown);
      await user.click(screen.getByText("Paragraph"));

      const editorElement = screen.getByRole("textbox");
      expect(editorElement?.innerHTML).toBe("<p>Hello World</p>");
    });
  });
});
