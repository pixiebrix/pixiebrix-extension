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

import styles from "./EditorTabLayout.module.scss";
import React, { useState } from "react";
import { Badge, Button, ButtonGroup, Nav, Tab } from "react-bootstrap";
import { type ButtonVariant, type Variant } from "react-bootstrap/types";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { freeze } from "@/utils/objectUtils";

export interface TabItem {
  name: string;
  badgeCount?: number;
  badgeVariant?: Variant;
  TabContent: React.FC;
}

export interface ActionButton {
  variant: ButtonVariant;
  onClick: () => void;
  caption: string;
  disabled?: boolean;
  icon?: IconProp;
}

const EMPTY_ARRAY = freeze<ActionButton[]>([]);

const EditorTabLayout: React.FC<{
  tabs: TabItem[];
  actionButtons?: ActionButton[];
  defaultTabName?: string;
}> = ({ tabs, actionButtons = EMPTY_ARRAY, defaultTabName }) => {
  const [activeTabName, setActiveTabName] = useState<string | undefined>(
    defaultTabName ?? tabs[0]?.name,
  );

  return (
    <div className={styles.root}>
      <Tab.Container activeKey={activeTabName}>
        <Nav
          variant="pills"
          activeKey={activeTabName}
          onSelect={(eventKey) => {
            // Booststrap's onSelect event handler passes the event key as a string or null
            // activeKey is required to be a string or undefined
            setActiveTabName(eventKey ?? undefined);
          }}
          className={styles.nav}
        >
          {tabs.map(({ name, badgeCount, badgeVariant }) => (
            <Nav.Item key={name} className={styles.navItem}>
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

          {actionButtons.length > 0 && (
            <>
              {/* spacer */}
              <div className="flex-grow-1" />
              <ButtonGroup>
                {actionButtons.map(
                  ({ variant, onClick, caption, disabled = false, icon }) => (
                    <Button
                      key={caption}
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
                  ),
                )}
              </ButtonGroup>
            </>
          )}
        </Nav>

        <Tab.Content className={styles.content}>
          {tabs.map(({ name, TabContent }) => (
            <Tab.Pane
              key={name}
              eventKey={name}
              // Simplify form state handling by only mounting when active
              mountOnEnter
              unmountOnExit
            >
              <TabContent />
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
    </div>
  );
};

export default EditorTabLayout;
