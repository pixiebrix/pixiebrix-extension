import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RichTextEditor from "./RichTextEditor";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/data/service/api";
import { API_PATHS } from "@/data/service/urlPaths";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { uuidv4 } from "@/types/helpers";

const axiosMock = new MockAdapter(axios);

const createTestStore = () =>
  configureStore({
    reducer: {
      appApi: appApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(appApi.middleware),
  });

jest.mock(
  "@/components/richTextEditor/toolbar/ImageButton/useFilePicker",
  () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(({ onFileSelect }) => ({
        async pickFile() {
          const file = new File(["test"], "test.png", { type: "image/png" });
          await onFileSelect(file);
        },
        isFilePickerOpen: false,
      })),
  }),
);

describe("RichTextEditor", () => {
  const user = userEvent.setup({
    delay: 20,
  });

  const renderWithStore = (component: React.ReactElement) => {
    const store = createTestStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  test("applies bold formatting using toolbar button", async () => {
    renderWithStore(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Bold" }));
    await user.type(editor, "and bold");

    expect(editor?.innerHTML).toBe("<p>regular<strong>and bold</strong></p>");
  });

  test("applies italic formatting using toolbar button", async () => {
    renderWithStore(<RichTextEditor />);

    const editor = screen.getByRole("textbox");
    await user.type(editor, "regular");
    await user.click(screen.getByRole("button", { name: "Italic" }));
    await user.type(editor, "and italic");

    expect(editor?.innerHTML).toBe("<p>regular<em>and italic</em></p>");
  });

  test("applies underline formatting using toolbar button", async () => {
    renderWithStore(<RichTextEditor />);

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
    renderWithStore(<RichTextEditor />);

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
        renderWithStore(<RichTextEditor content="Hello World" />);

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
      renderWithStore(<RichTextEditor content="<h1>Hello World</h1>" />);

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
      renderWithStore(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "first item");

      // Open the overflow menu first
      await user.click(
        screen.getByRole("button", { name: "More editing options" }),
      );
      await user.click(screen.getByRole("button", { name: "Bullet List" }));

      expect(editor?.innerHTML).toBe("<ul><li><p>first item</p></li></ul>");

      await user.type(editor, "{enter}second item");
      expect(editor?.innerHTML).toBe(
        "<ul><li><p>first item</p></li><li><p>second item</p></li></ul>",
      );
    });

    test("applies numbered list formatting using toolbar button", async () => {
      renderWithStore(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "first item");

      // Open the overflow menu first
      await user.click(
        screen.getByRole("button", { name: "More editing options" }),
      );
      await user.click(screen.getByRole("button", { name: "Numbered List" }));

      expect(editor?.innerHTML).toBe("<ol><li><p>first item</p></li></ol>");

      await user.type(editor, "{enter}second item");
      expect(editor?.innerHTML).toBe(
        "<ol><li><p>first item</p></li><li><p>second item</p></li></ol>",
      );
    });

    test("can remove list formatting", async () => {
      renderWithStore(<RichTextEditor />);

      const editor = screen.getByRole("textbox");
      await user.type(editor, "list item");

      // Open the overflow menu first
      await user.click(
        screen.getByRole("button", { name: "More editing options" }),
      );
      await user.click(screen.getByRole("button", { name: "Bullet List" }));
      expect(editor?.innerHTML).toBe("<ul><li><p>list item</p></li></ul>");

      await user.click(screen.getByRole("button", { name: "Bullet List" }));
      expect(editor?.innerHTML).toBe("<p>list item</p>");
    });
  });

  test("applies strikethrough formatting using toolbar button", async () => {
    renderWithStore(<RichTextEditor />);

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
    renderWithStore(<RichTextEditor />);

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

  test("uploads and inserts image using toolbar button", async () => {
    const databaseId = uuidv4();
    const assetId = uuidv4();

    const file = new File(["test"], "test.png", { type: "image/png" });
    const mockDownloadUrl = new URL("https://example.com/test.png");
    const mockUploadUrl = new URL("https://storage-upload.example.com");

    axiosMock.onPost(API_PATHS.ASSET_PRE_UPLOAD(databaseId)).reply(200, {
      asset: {
        id: assetId,
        download_url: mockDownloadUrl.href,
        filename: file.name,
        is_uploaded: false,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      upload_url: mockUploadUrl.href,
      fields: {
        key: "test-key",
        policy: "test-policy",
      },
    });

    axiosMock.onPost(mockUploadUrl.href).reply(200);

    // Mock the asset update request
    axiosMock.onPatch(API_PATHS.ASSET(databaseId, assetId)).reply(200, {
      id: assetId,
      download_url: mockDownloadUrl.href,
      filename: file.name,
      is_uploaded: true,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    renderWithStore(<RichTextEditor assetDatabaseId={databaseId} />);

    await user.click(screen.getByRole("button", { name: "Insert Image" }));

    await waitFor(() => {
      const editor = screen.getByRole("textbox");
      expect(editor?.innerHTML).toBe(
        `<p><img style="max-width: 100%" src="${mockDownloadUrl.href}" alt="" draggable="true"><img class="ProseMirror-separator" alt=""><br class="ProseMirror-trailingBreak"></p>`
      );
    });
  });
});
