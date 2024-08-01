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
import { Menu, MenuItem, MenuButton, SubMenu } from "@szhsin/react-menu";
import React from "react";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import styles from "./EllipsisMenu.module.scss";
import cx from "classnames";

type MenuItemBase = {
  /**
   * User-visible display for the item, generally text of some sort
   */
  title: string;
  icon?: ReactElement;
  className?: string;
  hide?: boolean;
  disabled?: boolean;
};

type ActionEllipsisMenuItem = MenuItemBase & {
  action: (() => void) | null;
};

type LinkEllipsisMenuItem = MenuItemBase & {
  href: string | null;
};

type SubmenuEllipsisMenuItem = MenuItemBase & {
  submenu: Array<
    LinkEllipsisMenuItem | ActionEllipsisMenuItem | SubmenuEllipsisMenuItem
  >;
};

export type EllipsisMenuItem =
  | LinkEllipsisMenuItem
  | ActionEllipsisMenuItem
  | SubmenuEllipsisMenuItem;

type EllipsisMenuProps = {
  ariaLabel?: string;

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
   * True to render the dropdown menu in a portal in order to avoid clipping issues with e.g. scrollable containers
   */
  portal?: boolean;

  /**
   * The classNames prop for the menu and/or menu button toggle.
   */
  classNames?: {
    menu?: string;
    menuButton?: string;
  };
};

const getMenuItemComponent = (item: EllipsisMenuItem): ReactElement => {
  if ("href" in item) {
    return (
      <MenuItem
        key={item.title}
        href={item.href ?? undefined}
        className={cx(styles.menuItem, item.className)}
        disabled={item.disabled}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.icon}&nbsp;{item.title}
      </MenuItem>
    );
  }

  if ("submenu" in item) {
    const label = item.icon ? (
      <>
        {item.icon}&nbsp;{item.title}
      </>
    ) : (
      item.title
    );

    return (
      <SubMenu label={label} key={item.title}>
        {item.submenu.map((subItem) => getMenuItemComponent(subItem))}
      </SubMenu>
    );
  }

  return (
    <MenuItem
      key={item.title}
      onClick={item.action ?? undefined}
      className={cx(styles.menuItem, item.className)}
      disabled={item.disabled}
    >
      {item.icon}&nbsp;{item.title}
    </MenuItem>
  );
};

const EllipsisMenu: React.FunctionComponent<EllipsisMenuProps> = ({
  ariaLabel,
  items,
  boundingBoxRef,
  portal,
  classNames,
}) => (
  <Menu
    align="end"
    direction="bottom"
    gap={4}
    boundingBoxRef={boundingBoxRef}
    portal={portal}
    className={classNames?.menu}
    menuButton={
      <MenuButton
        aria-label={ariaLabel}
        className={cx(styles.button, classNames?.menuButton)}
        data-testid="ellipsis-menu-button"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </MenuButton>
    }
  >
    {items.filter((x) => !x.hide).map((item) => getMenuItemComponent(item))}
  </Menu>
);

export default EllipsisMenu;
