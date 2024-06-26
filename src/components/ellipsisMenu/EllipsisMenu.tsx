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

import React, { type ReactElement, type SyntheticEvent } from "react";
import { Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import type { RequireExactlyOne } from "type-fest";
import styles from "./EllipsisMenu.module.scss";
import { type ButtonVariant } from "react-bootstrap/types";

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
  variant?: ButtonVariant;

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
  menuBoundary?: Element;

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
  menuBoundary,
  alignRight,
}) => {
  const onToggle = (
    isOpen: boolean,
    event: SyntheticEvent<Dropdown>,
    metadata: {
      source: "select" | "click" | "rootClose" | "keydown";
    },
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
          error,
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
        size={size === "md" ? undefined : size}
        aria-label={ariaLabel}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={dropdownMenuOptions} alignRight={alignRight}>
        {items
          .filter((x) => !x.hide)
          .map((item) =>
            item.href ? (
              <Dropdown.Item
                key={item.title}
                href={item.href}
                className={item.className}
                disabled={item.disabled}
                // There's a bug: the link stays active after clicking it
                active={false}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.icon} {item.title}
              </Dropdown.Item>
            ) : (
              <Dropdown.Item
                key={item.title}
                onClick={item.action}
                className={item.className}
                disabled={item.disabled}
              >
                {item.icon} {item.title}
              </Dropdown.Item>
            ),
          )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default EllipsisMenu;
