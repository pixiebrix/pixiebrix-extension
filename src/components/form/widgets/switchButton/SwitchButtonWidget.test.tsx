import { fireEvent, render } from "@testing-library/react";
import React from "react";
import SwitchButtonWidget from "./SwitchButtonWidget";

const values = [true, false];
test.each(values)("renders value %s", (value) => {
  const rendered = render(
    <SwitchButtonWidget value={value} onChange={jest.fn()} />
  );
  expect(rendered.asFragment()).toMatchSnapshot();
});

test.each(values)("calls onChange", (value) => {
  const name = "Name for Test";
  const onChangeMock = jest.fn();
  const { container } = render(
    <SwitchButtonWidget value={value} onChange={onChangeMock} name={name} />
  );

  fireEvent.click(container.querySelector(".switch"));

  expect(onChangeMock).toHaveBeenCalledWith({
    target: {
      value: !value,
      name,
    },
  });
});
