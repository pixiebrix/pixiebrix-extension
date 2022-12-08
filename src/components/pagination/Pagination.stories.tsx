import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import React, { useState } from "react";
import Pagination from "./Pagination";

const componentMeta: ComponentMeta<typeof Pagination> = {
  title: "Components/Pagination",
  component: Pagination,
  argTypes: {
    setPage: {
      action: "setPage",
    },
  },
};

const Template: ComponentStory<typeof Pagination> = ({
  numPages,
  setPage,
  ...rest
}) => {
  const [page, setPageInternal] = useState(0);
  const onSetPage = (nextPage: number) => {
    setPageInternal(nextPage);
    setPage?.(nextPage);
  };

  return (
    <Pagination page={page} setPage={onSetPage} numPages={numPages} {...rest} />
  );
};

export const Default = Template.bind({});
Default.args = {
  numPages: 10,
};

export default componentMeta;
