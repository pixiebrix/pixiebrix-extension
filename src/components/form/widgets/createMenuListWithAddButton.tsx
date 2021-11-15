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

import React from "react";
import { Button } from "react-bootstrap";
import {
  MenuList,
  MenuListComponentProps,
} from "react-select/src/components/Menu";

type MenuListProps = any;

type MenuListWithAddButtonProps = {
  onAddClick: () => void;
} & MenuListProps;

const MenuListWithAddButton_: React.FC<MenuListWithAddButtonProps> = ({
  children,
  onAddClick,
  ...rest
}) => (
  <MenuList {...rest}>
    {children}
    <div className="text-center">
      <Button size="sm" variant="link" onClick={onAddClick}>
        + Add new
      </Button>
    </div>
  </MenuList>
);

export const MenuListWithAddButton: React.FC<MenuListWithAddButtonProps> = (
  props
) => {
  const {
    children,
    className,
    cx,
    getStyles,
    innerProps,
    innerRef,
    isMulti,
    onAddClick,
  } = props;

  return (
    <div
      css={getStyles("menuList", props)}
      className={cx(
        {
          "menu-list": true,
          "menu-list--is-multi": isMulti,
        },
        className
      )}
      ref={innerRef}
      {...innerProps}
    >
      {children}
    </div>
  );
};

export const MenuListWithAddButton2 = React.forwardRef((props, ref) => (
  <MenuList {...props} innerRef={ref} />
));
/**
 * This is meant to be used together with {@link SelectWidget} to show "Add new" button.
 * See [From.stories.tsx](https://github.com/pixiebrix/pixiebrix-extension/blob/main/src/components/form/Form.stories.tsx#L184:L195) for usage example.
 */
const createMenuListWithAddButton = (onAddClick: () => void) => {
  const MenuListInstance: React.FC<MenuListProps> = (menuListProps) => (
    <MenuListWithAddButton onAddClick={onAddClick} {...menuListProps} />
  );
  return MenuListInstance;
};

export default createMenuListWithAddButton;
