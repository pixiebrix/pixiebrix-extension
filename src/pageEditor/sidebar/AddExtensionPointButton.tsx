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
import { useAsyncState } from "@/hooks/common";

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

  const [entries] = useAsyncState<React.ReactNode>(
    async () => {
      const results = await Promise.all(
        sortedExtensionPoints.map((config) => {
          if (!config.flag) {
            return true;
          }

          return flagOn(config.flag);
        })
      );

      return (
        sortedExtensionPoints
          // eslint-disable-next-line security/detect-object-injection -- array index
          .filter((_, index) => results[index])
          .map((config) => (
            <DropdownEntry
              key={config.elementType}
              caption={config.label}
              icon={config.icon}
              beta={Boolean(config.flag)}
              onClick={() => {
                addElement(config);
              }}
            />
          ))
      );
    },
    [],
    []
  );

  return (
    <DropdownButton
      disabled={!tabHasPermissions}
      variant="info"
      size="sm"
      title="Add"
      id="add-extension-point"
    >
      {entries}
    </DropdownButton>
  );
};

export default AddExtensionPointButton;
