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
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { sortBy } from "lodash";
import useAddNewModComponent from "@/pageEditor/hooks/useAddNewModComponent";
import { useSelector } from "react-redux";
import { selectTabHasPermissions } from "@/pageEditor/tabState/tabStateSelectors";
import useAsyncState from "@/hooks/useAsyncState";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { inspectedTab } from "@/pageEditor/context/connection";
import { flagOn } from "@/auth/featureFlagStorage";

const sortedStarterBricks = sortBy(
  [...ADAPTERS.values()],
  (x) => x.displayOrder,
);

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

  const addNewModComponent = useAddNewModComponent();

  const { data: entries = [] } = useAsyncState<React.ReactNode>(async () => {
    const results = await Promise.all(
      sortedStarterBricks.map(async (config) => {
        if (!config.flag) {
          return true;
        }

        return flagOn(config.flag);
      }),
    );

    return (
      sortedStarterBricks
        // eslint-disable-next-line security/detect-object-injection -- array index
        .filter((_, index) => results[index])
        .map((config) => (
          <DropdownEntry
            key={config.elementType}
            caption={config.label}
            icon={config.icon}
            beta={Boolean(config.flag)}
            onClick={() => {
              addNewModComponent(config);
            }}
          />
        ))
    );
  }, []);

  return (
    <DropdownButton
      disabled={!tabHasPermissions}
      variant="info"
      size="sm"
      title="Add"
      id="add-starter-brick"
    >
      {entries}

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
