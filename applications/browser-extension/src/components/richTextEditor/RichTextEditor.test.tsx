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

    // Open the overflow menu
    await user.click(
      screen.getByRole("button", { name: "More editing options" }),
    );
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

    // Open the overflow menu
    await user.click(
      screen.getByRole("button", { name: "More editing options" }),
    );
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

  describe("lists", () => {
    test("applies bullet list formatting using toolbar button", async () => {
      render(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "first item");
      await user.click(screen.getByRole("button", { name: "Bullet List" }));

      expect(editor?.innerHTML).toBe("<ul><li><p>first item</p></li></ul>");

      await user.type(editor, "{enter}second item");
      expect(editor?.innerHTML).toBe(
        "<ul><li><p>first item</p></li><li><p>second item</p></li></ul>",
      );
    });

    test("applies numbered list formatting using toolbar button", async () => {
      render(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "first item");
      await user.click(screen.getByRole("button", { name: "Numbered List" }));

      expect(editor?.innerHTML).toBe("<ol><li><p>first item</p></li></ol>");

      await user.type(editor, "{enter}second item");
      expect(editor?.innerHTML).toBe(
        "<ol><li><p>first item</p></li><li><p>second item</p></li></ol>",
      );
    });

    test("can remove list formatting", async () => {
      render(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "list item");

      await user.click(screen.getByRole("button", { name: "Bullet List" }));
      expect(editor?.innerHTML).toBe("<ul><li><p>list item</p></li></ul>");

      await user.click(screen.getByRole("button", { name: "Bullet List" }));
      expect(editor?.innerHTML).toBe("<p>list item</p>");
    });
  });

  test("applies strikethrough formatting using toolbar button", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");

    await user.click(
      screen.getByRole("button", { name: "More editing options" }),
    );
    await user.click(screen.getByRole("button", { name: "Strikethrough" }));
    await user.type(editor, "struck through");

    expect(editor?.innerHTML).toBe("<p>regular<s>struck through</s></p>");
  });

  //  User.pointer is successfully selecting the test, but Tiptap isn't seeing it
  // eslint-disable-next-line jest/no-disabled-tests -- TODO: playwright test for this when RichTextEditor is complete
  test.skip("applies link formatting using toolbar button", async () => {
    render(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "This is my link");

    await user.pointer([
      // First char of "link"
      { target: editor, offset: 11, keys: "[MouseLeft>]" },
      // Drag to end of "link"
      { offset: 15 },
      { keys: "[/MouseLeft]" },
    ]);

    const selection = document.getSelection()?.toString();
    expect(selection).toBe("link");

    await user.click(screen.getByRole("button", { name: /link/i }));

    expect(
      screen.getByRole("textbox", { name: /newurl/i }),
    ).toBeInTheDocument();
  });
});
