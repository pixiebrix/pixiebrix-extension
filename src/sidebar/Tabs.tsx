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

import React, { useCallback, useEffect } from "react";
import { SidebarEntries, PanelEntry } from "@/sidebar/types";
import { mapTabEventKey } from "@/sidebar/utils";
import useExtensionMeta from "@/hooks/useExtensionMeta";
import { UUID } from "@/core";
import { reportEvent } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";
import { Card, Nav, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import ErrorBoundary from "@/components/ErrorBoundary";
import PanelBody from "@/sidebar/PanelBody";
import FormBody from "@/sidebar/FormBody";

type SidebarTabsProps = SidebarEntries & {
  activeKey: string;
  onSelectTab: (eventKey: string) => void;
};

const Tabs: React.FunctionComponent<SidebarTabsProps> = ({
  activeKey,
  panels,
  forms,
  onSelectTab,
}) => {
  const { lookup } = useExtensionMeta();

  const onSelect = useCallback(
    (extensionId: UUID) => {
      reportEvent("ViewSidePanelPanel", {
        ...selectEventData(lookup.get(extensionId)),
        initialLoad: false,
      });
      onSelectTab(extensionId);
    },
    [onSelectTab, lookup]
  );

  useEffect(
    () => {
      reportEvent("ViewSidePanelPanel", {
        ...selectEventData(lookup.get(activeKey)),
        initialLoad: true,
      });
    },
    // Only run on initial mount, other views are handled by onSelect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Tab.Container
      id="panel-container"
      defaultActiveKey={activeKey}
      activeKey={activeKey}
    >
      <Card>
        <Card.Header>
          <Nav variant="tabs" onSelect={onSelect}>
            {panels.map((panel) => (
              <Nav.Link
                key={panel.extensionId}
                eventKey={mapTabEventKey("panel", panel)}
              >
                {panel.heading ?? <FontAwesomeIcon icon={faSpinner} />}
              </Nav.Link>
            ))}
            {forms.map((form) => (
              <Nav.Link
                key={form.extensionId}
                eventKey={mapTabEventKey("form", form)}
              >
                {form.form.schema.title ?? "Form"}
              </Nav.Link>
            ))}
          </Nav>
        </Card.Header>
        <Card.Body className="p-0 scrollable-area full-height">
          <Tab.Content className="p-0 border-0 full-height">
            {panels.map((panel: PanelEntry) => (
              <Tab.Pane
                className="full-height flex-grow"
                key={panel.extensionId}
                eventKey={mapTabEventKey("panel", panel)}
              >
                <ErrorBoundary>
                  <PanelBody
                    isRootPanel
                    payload={panel.payload}
                    context={{
                      extensionId: panel.extensionId,
                      extensionPointId: panel.extensionPointId,
                      blueprintId: panel.blueprintId,
                    }}
                  />
                </ErrorBoundary>
              </Tab.Pane>
            ))}
            {forms.map((form) => (
              <Tab.Pane
                className="full-height flex-grow"
                key={form.nonce}
                eventKey={mapTabEventKey("form", form)}
              >
                <ErrorBoundary>
                  <FormBody form={form} />
                </ErrorBoundary>
              </Tab.Pane>
            ))}
          </Tab.Content>
        </Card.Body>
      </Card>
    </Tab.Container>
  );
};

export default Tabs;
