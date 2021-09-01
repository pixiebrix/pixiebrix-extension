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

import React, { ReactNode, SyntheticEvent } from "react";
import { Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import styles from "./EllipsisMenu.module.scss";

type Item = {
  title: ReactNode;
  hide?: boolean;
  action: () => void;
  className?: string;
};

const EllipsisMenu: React.FunctionComponent<{
  variant?: string;
  items: Item[];
}> = ({ variant = "light", items }) => {
  const onToggle = (
    isOpen: boolean,
    event: SyntheticEvent<Dropdown>,
    metadata: {
      source: "select" | "click" | "rootClose" | "keydown";
    }
  ) => {
    event.stopPropagation();

    if (metadata.source === "click" && isOpen) {
      try {
        document.body.click();
      } catch (error: unknown) {
        console.debug(
          "EllipsisMenu. Failed trigger closing other menus",
          error
        );
      }
    }
  };

  return (
    <Dropdown alignRight onToggle={onToggle}>
      <Dropdown.Toggle className={styles.toggle} variant={variant} size="sm">
        <FontAwesomeIcon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {items
          .filter((x) => !x.hide)
          .map((item, index) => (
            <Dropdown.Item
              key={index}
              onClick={() => {
                item.action();
              }}
              className={item.className}
            >
              {item.title}
            </Dropdown.Item>
          ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default EllipsisMenu;
