import React from "react";
import { render, screen } from "@testing-library/react";
import EllipsisMenu, { type EllipsisMenuItem } from "./EllipsisMenu";
import ClickableElement from "@/components/ClickableElement";
import { userEvent } from "@/pageEditor/testHelpers";

describe("EllipsisMenu", () => {
  const mockItems: EllipsisMenuItem[] = [
    { title: "Item 1", action: jest.fn() },
    { title: "Item 2", action: jest.fn() },
  ];

  it("prevents event propagation when clicking the menu button", async () => {
    const mockParentClick = jest.fn();

    render(
      <ClickableElement onClick={mockParentClick}>
        <EllipsisMenu items={mockItems} />
      </ClickableElement>,
    );

    const menuButton = screen.getByTestId("ellipsis-menu-button");
    await userEvent.click(menuButton);

    expect(mockParentClick).not.toHaveBeenCalled();
  });

  it("prevents event propagation when clicking a submenu item", async () => {
    const mockParentClick = jest.fn();
    const submenuItems: EllipsisMenuItem[] = [
      {
        title: "Submenu",
        submenu: [
          { title: "Subitem 1", action: jest.fn() },
          { title: "Subitem 2", action: jest.fn() },
        ],
      },
    ];

    render(
      <ClickableElement onClick={mockParentClick}>
        <EllipsisMenu items={submenuItems} />
      </ClickableElement>,
    );

    const menuButton = screen.getByTestId("ellipsis-menu-button");
    await userEvent.click(menuButton);

    const submenuItem = screen.getByText("Submenu");
    await userEvent.click(submenuItem);

    expect(mockParentClick).not.toHaveBeenCalled();
  });
});
