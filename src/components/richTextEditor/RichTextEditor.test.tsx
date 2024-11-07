import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RichTextEditor from "./RichTextEditor";

describe("RichTextEditor", () => {
  const user = userEvent.setup({
    delay: 20,
  });

  test("applies bold formatting using toolbar button", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.type(editor, "and bold");

    expect(editor?.innerHTML).toBe("<p>regular<strong>and bold</strong></p>");
  });

  test("applies italic formatting using toolbar button", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Italic" }));
    await user.type(editor, "and italic");

    expect(editor?.innerHTML).toBe("<p>regular<em>and italic</em></p>");
  });

  test("applies underline formatting using toolbar button", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Underline" }));
    await user.type(editor, "and underlined");

    expect(editor?.innerHTML).toBe("<p>regular<u>and underlined</u></p>");
  });

  test("applies bold, italic and underline formatting using toolbar buttons", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Italic" }));
    await user.click(screen.getByRole("button", { name: "Underline" }));
    await user.type(editor, "all formats");

    expect(editor?.innerHTML).toBe(
      "<p>regular<strong><em><u>all formats</u></em></strong></p>",
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
