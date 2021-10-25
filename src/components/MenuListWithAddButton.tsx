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

type MenuListWithAddButtonProps = {
  onAddClick: () => void;
};

const MenuListWithAddButton: React.FC<MenuListWithAddButtonProps> = ({
  children,
  onAddClick,
}) => (
  <div>
    {children}
    <div className="text-center">
      <Button size="sm" variant="link" onClick={onAddClick}>
        + Add new
      </Button>
    </div>
  </div>
);

export const createMenuListWithAddButton = (onAddClick: () => void) => {
  const MenuList: React.FC = ({ children }) => (
    <MenuListWithAddButton onAddClick={onAddClick}>
      {children}
    </MenuListWithAddButton>
  );
  return MenuList;
};

export default MenuListWithAddButton;
