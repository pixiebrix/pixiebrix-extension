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

import React from "react";
import { Badge, Dropdown, DropdownButton } from "react-bootstrap";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAddNewModComponent from "@/pageEditor/hooks/useAddNewModComponent";
import { useSelector } from "react-redux";
import { selectTabHasPermissions } from "@/pageEditor/store/tabState/tabStateSelectors";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import { inspectedTab } from "@/pageEditor/context/connection";
import { useAvailableFormStateAdapters } from "@/pageEditor/starterBricks/adapter";

const TEMPLATE_TELEMETRY_SOURCE = "starter_brick_menu";

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

const AddStarterBrickButton: React.FunctionComponent = () => {
  const tabHasPermissions = useSelector(selectTabHasPermissions);
  const sessionId = useSelector(selectSessionId);
  const modComponentFormStateAdapters = useAvailableFormStateAdapters();
  const addNewModComponent = useAddNewModComponent();

  return (
    <DropdownButton
      disabled={!tabHasPermissions}
      variant="info"
      size="sm"
      title="Add"
      id="add-starter-brick"
    >
      {modComponentFormStateAdapters.map((adapter) => (
        <DropdownEntry
          key={adapter.starterBrickType}
          caption={adapter.label}
          icon={adapter.icon}
          beta={Boolean(adapter.flag)}
          onClick={() => {
            addNewModComponent(adapter);
          }}
        />
      ))}

      <Dropdown.Divider />
      <Dropdown.Item
        onClick={() => {
          reportEvent(Events.PAGE_EDITOR_VIEW_TEMPLATES, {
            sessionId,
            source: TEMPLATE_TELEMETRY_SOURCE,
          });
          void browser.tabs.update(inspectedTab.tabId, {
            url: `https://www.pixiebrix.com/templates-gallery?utm_source=pixiebrix&utm_medium=page_editor&utm_campaign=${TEMPLATE_TELEMETRY_SOURCE}`,
          });
        }}
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} fixedWidth />
        &nbsp;Start with a Template
      </Dropdown.Item>
    </DropdownButton>
  );
};

export default AddStarterBrickButton;
