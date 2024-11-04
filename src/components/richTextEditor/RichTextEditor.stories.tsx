import { type Meta, type StoryObj } from "@storybook/react";
import RichTextEditor from "./RichTextEditor";

const meta: Meta<typeof RichTextEditor> = {
  title: "Components/RichTextEditor",
  component: RichTextEditor,
  parameters: {
    // FIXME: https://github.com/pixiebrix/pixiebrix-extension/issues/9393
    storyshots: { disable: true },
  },
};

export default meta;

type Story = StoryObj<typeof RichTextEditor>;

export const Default: Story = {
  args: {
    content: "Type something here...",
  },
};

export const WithInitialContent: Story = {
  args: {
    content: "This is some <strong>bold</strong> and <em>italic</em> text.",
  },
};

export const Empty: Story = {
  args: {
    content: "",
  },
};

export const ReadOnly: Story = {
  args: {
    content: "This content cannot be edited.",
    editable: false,
  },
};
