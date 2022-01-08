/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { ReactNode, SyntheticEvent } from "react";
import { Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import styles from "./EllipsisMenu.module.scss";

type Item = {
  title: ReactNode;
  hide?: boolean;
  action: () => void;
  className?: string;
  disabled?: boolean;
};

const EllipsisMenu: React.FunctionComponent<{
  className?: string;
  toggleClassName?: string;
  variant?: string;
  items: Item[];
  menuBoundary?: Element;
}> = ({
  className,
  toggleClassName,
  variant = "light",
  items,
  menuBoundary,
}) => {
  const onToggle = (
    isOpen: boolean,
    event: SyntheticEvent<Dropdown>,
    metadata: {
      source: "select" | "click" | "rootClose" | "keydown";
    }
  ) => {
    event.stopPropagation();

    if (metadata.source === "click" && isOpen) {
      try {
        // The click on this toggle doesn't go beyond the component,
        // hence no other element knows that the click happened.
        // Simulating the click on the body will let other menus know user clicked somewhere.
        document.body.click();
      } catch (error) {
        console.debug(
          "EllipsisMenu. Failed to trigger closing other menus",
          error
        );
      }
    }
  };

  // This will set the boundary element for the Ellipsis menu popup
  const dropdownMenuOptions = menuBoundary
    ? {
        modifiers: [
          {
            name: "flip",
            options: {
              boundary: menuBoundary,
            },
          },
        ],
      }
    : undefined;

  return (
    <Dropdown alignRight onToggle={onToggle} className={className}>
      <Dropdown.Toggle
        className={cx(styles.toggle, toggleClassName)}
        variant={variant}
        size="sm"
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={dropdownMenuOptions}>
        {items
          .filter((x) => !x.hide)
          .map((item, index) => (
            <Dropdown.Item
              key={index}
              onClick={() => {
                item.action();
              }}
              className={item.className}
              disabled={item.disabled}
            >
              {item.title}
            </Dropdown.Item>
          ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default EllipsisMenu;
