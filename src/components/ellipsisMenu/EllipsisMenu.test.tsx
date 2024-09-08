import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EllipsisMenu, { type EllipsisMenuItem } from "./EllipsisMenu";
import ClickableElement from "@/components/ClickableElement";

describe("EllipsisMenu", () => {
  const mockItems: EllipsisMenuItem[] = [
    { title: "Item 1", action: jest.fn() },
    { title: "Item 2", action: jest.fn() },
  ];

  it("prevents event propagation when clicking the menu button", () => {
    const mockParentClick = jest.fn();

    render(
      <ClickableElement onClick={mockParentClick}>
        <EllipsisMenu items={mockItems} />
      </ClickableElement>,
    );

    const menuButton = screen.getByTestId("ellipsis-menu-button");
    fireEvent.click(menuButton);

    expect(mockParentClick).not.toHaveBeenCalled();
  });

  // ... existing code ...

  it("prevents event propagation when clicking a submenu item", () => {
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
    fireEvent.click(menuButton);

    const submenuItem = screen.getByText("Submenu");
    fireEvent.click(submenuItem);

    expect(mockParentClick).not.toHaveBeenCalled();
  });
});
