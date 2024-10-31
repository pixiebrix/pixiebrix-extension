import React from "react";
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import RichTextEditor from "./RichTextEditor";

export default {
  title: "Components/RichTextEditor",
  component: RichTextEditor,
} as ComponentMeta<typeof RichTextEditor>;

const Template: ComponentStory<typeof RichTextEditor> = (args) => (
  <RichTextEditor {...args} />
);

export const Default = Template.bind({});
Default.args = {
  content: "Type something here...",
};

export const WithInitialContent = Template.bind({});
WithInitialContent.args = {
  content: "This is some <strong>bold</strong> and <em>italic</em> text.",
};

export const Empty = Template.bind({});
Empty.args = {
  content: "",
};

export const ReadOnly = Template.bind({});
ReadOnly.args = {
  content: "This content cannot be edited.",
  editable: false,
};
