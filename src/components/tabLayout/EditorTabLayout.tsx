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

import styles from "./EditorTabLayout.module.scss";
import React, { useState } from "react";
import { Badge, Button, ButtonGroup, Nav, Tab } from "react-bootstrap";
import { ButtonVariant, Variant } from "react-bootstrap/types";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface TabItem {
  name: string;
  badgeCount?: number;
  badgeVariant?: Variant;
  TabContent: React.VoidFunctionComponent;
  mountWhenActive?: boolean;
}

export interface ActionButton {
  variant: ButtonVariant;
  onClick: () => void;
  caption: string;
  disabled?: boolean;
  icon?: IconProp;
}

const EditorTabLayout: React.FC<{
  tabs: TabItem[];
  actionButtons: ActionButton[];
  defaultTabName?: string;
}> = ({ tabs, actionButtons, defaultTabName }) => {
  const [activeTabName, setActiveTabName] = useState(
    defaultTabName ?? tabs[0].name
  );

  return (
    <div className={styles.root}>
      <Tab.Container activeKey={activeTabName}>
        <Nav
          variant="pills"
          activeKey={activeTabName}
          onSelect={setActiveTabName}
          className={styles.nav}
        >
          {tabs.map(({ name, badgeCount, badgeVariant }) => (
            <Nav.Item key={`nav-tab-${name}`} className={styles.navItem}>
              <Nav.Link eventKey={name} className={styles.navLink}>
                {name}
                {badgeCount && badgeVariant && (
                  <Badge className={styles.badge} variant={badgeVariant}>
                    {badgeCount}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
          ))}

          {/* spacer */}
          <div className="flex-grow-1" />

          <ButtonGroup>
            {actionButtons.map(
              (
                { variant, onClick, caption, disabled = false, icon },
                index
              ) => (
                <Button
                  key={index} // Action buttons shouldn't normally be changing order
                  size="sm"
                  variant={variant}
                  disabled={disabled}
                  onClick={onClick}
                >
                  {icon && (
                    <FontAwesomeIcon
                      icon={icon}
                      className={styles.actionButtonIcon}
                    />
                  )}
                  {caption}
                </Button>
              )
            )}
          </ButtonGroup>
        </Nav>

        <Tab.Content className={styles.content}>
          {tabs.map(({ name, TabContent, mountWhenActive }) => (
            <Tab.Pane
              key={name}
              eventKey={name}
              mountOnEnter={mountWhenActive}
              unmountOnExit={mountWhenActive}
            >
              <TabContent key={name} />
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
    </div>
  );
};

export default EditorTabLayout;
