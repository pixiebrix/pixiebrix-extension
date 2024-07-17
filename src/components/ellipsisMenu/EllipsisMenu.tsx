/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type MutableRefObject, type ReactElement } from "react";
import { type RequireExactlyOne } from "type-fest";
import { Menu, MenuItem, MenuButton } from "@szhsin/react-menu";
import React from "react";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";

type EllipsisMenuItemInternal = {
  /**
   * User-visible display for the item, generally text of some sort
   */
  title: string;

  icon?: ReactElement;

  /**
   * The "on select" action for the item
   * You should provide either this or href, but not both
   */
  action: () => void;

  /**
   * The href for the item, if it's a link
   * You should provide either this or action, but not both
   */
  href: string;

  className?: string;
  hide?: boolean;
  disabled?: boolean;
};

export type EllipsisMenuItem = RequireExactlyOne<
  EllipsisMenuItemInternal,
  "action" | "href"
>;

type EllipsisMenuProps = {
  ariaLabel?: string;

  className?: string;

  /**
   * The className prop for the dropdown menu toggle
   */
  toggleClassName?: string;

  /**
   * The bootstrap button variant for the toggle
   */
  variant?: string;

  /**
   * The bootstrap button size for the toggle. Note that
   * "md" is the bootstrap style for when neither the "btn-sm"
   * nor the "btn-lg" class is present.
   */
  size?: "sm" | "md" | "lg";

  /**
   * The dropdown menu options
   */
  items: EllipsisMenuItem[];

  /**
   * The boundary element for the dropdown menu popup
   * @see DropdownMenuProps.popperConfig
   */
  boundingBoxRef?: MutableRefObject<HTMLElement | null>;

  /**
   * Align the dropdown menu to the right side of the toggle
   * @see DropdownMenuProps.alignRight
   */
  alignRight?: boolean;
};

const EllipsisMenu: React.FunctionComponent<EllipsisMenuProps> = ({
  ariaLabel,
  className,
  toggleClassName,
  variant = "light",
  size = "sm",
  items,
  boundingBoxRef,
  alignRight,
}) => (
  <Menu
    boundingBoxRef={boundingBoxRef}
    className={className}
    menuButton={
      <MenuButton
        aria-label={ariaLabel}
        onClick={(event) => {
          console.log("MenuButton onClick", event);
          event.stopPropagation();
        }}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </MenuButton>
    }
  >
    {items
      .filter((x) => !x.hide)
      .map((item) =>
        item.href ? (
          <MenuItem
            key={item.title}
            href={item.href}
            className={item.className}
            disabled={item.disabled}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.icon} {item.title}
          </MenuItem>
        ) : (
          <MenuItem
            key={item.title}
            onClick={item.action}
            className={item.className}
            disabled={item.disabled}
          >
            {item.icon} {item.title}
          </MenuItem>
        ),
      )}
  </Menu>
);

export default EllipsisMenu;
