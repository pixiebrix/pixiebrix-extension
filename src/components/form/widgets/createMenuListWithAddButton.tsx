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
import { GroupBase, MenuListProps } from "react-select";

type MenuListWithAddButtonProps<
  OptionType,
  IsMulti extends boolean,
  GroupType extends GroupBase<OptionType> = GroupBase<OptionType>
> = MenuListProps<OptionType, IsMulti, GroupType> & {
  onAddClick: () => void;
};

const MenuListWithAddButton = <
  OptionType,
  IsMulti extends boolean,
  GroupType extends GroupBase<OptionType> = GroupBase<OptionType>
>(
  props: MenuListWithAddButtonProps<OptionType, IsMulti, GroupType>
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
      // @ts-expect-error TS2322 Maybe there's a mismatch in types
      style={getStyles("menuList", props)}
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
      <div className="text-center">
        <Button size="sm" variant="link" onClick={onAddClick}>
          + Add new
        </Button>
      </div>
    </div>
  );
};

/**
 * This is meant to be used together with {@link SelectWidget} to show "Add new" button.
 * See [From.stories.tsx](https://github.com/pixiebrix/pixiebrix-extension/blob/main/src/components/form/Form.stories.tsx#L184:L195) for usage example.
 */
const createMenuListWithAddButton = (onAddClick: () => void) => {
  const MenuList = <
    OptionType,
    IsMulti extends boolean,
    GroupType extends GroupBase<OptionType> = GroupBase<OptionType>
  >(
    menuListProps: MenuListWithAddButtonProps<OptionType, IsMulti, GroupType>
  ) => <MenuListWithAddButton onAddClick={onAddClick} {...menuListProps} />;
  return MenuList;
};

export default createMenuListWithAddButton;
