/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { Badge, Dropdown, DropdownButton } from "react-bootstrap";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { flagOn } from "@/auth/token";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { sortBy } from "lodash";
import useAddElement from "@/pageEditor/hooks/useAddElement";
import { useSelector } from "react-redux";
import { selectTabHasPermissions } from "@/pageEditor/tabState/tabStateSelectors";

const sortedExtensionPoints = sortBy(
  [...ADAPTERS.values()],
  (x) => x.displayOrder
);

const DropdownEntry: React.FunctionComponent<{
  caption: string;
  icon: IconProp;
  onClick: () => void;
  beta?: boolean;
}> = ({ beta, icon, caption, onClick }) => (
  <Dropdown.Item onClick={onClick}>
    <FontAwesomeIcon icon={icon} fixedWidth />
    &nbsp;{caption}
    {beta && (
      <>
        {" "}
        <Badge variant="success" pill>
          Beta
        </Badge>
      </>
    )}
  </Dropdown.Item>
);

const AddExtensionPointButton: React.FunctionComponent = () => {
  const tabHasPermissions = useSelector(selectTabHasPermissions);

  const addElement = useAddElement();

  return (
    <DropdownButton
      disabled={!tabHasPermissions}
      variant="info"
      size="sm"
      title="Add"
      id="add-extension-point"
    >
      {sortedExtensionPoints
        .filter((element) => !element.flag || flagOn(element.flag))
        .map((element) => (
          <DropdownEntry
            key={element.elementType}
            caption={element.label}
            icon={element.icon}
            beta={Boolean(element.flag)}
            onClick={() => {
              addElement(element);
            }}
          />
        ))}
    </DropdownButton>
  );
};

export default AddExtensionPointButton;
