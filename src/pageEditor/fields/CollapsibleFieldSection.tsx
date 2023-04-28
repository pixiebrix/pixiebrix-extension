/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { Collapse } from "react-bootstrap";
import styles from "@/pageEditor/fields/CollapsibleFieldSection.module.scss";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const CollapsibleFieldSection: React.FC<{
  title: string;
  toggleExpanded: () => void;
  expanded?: boolean;
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
}> = ({ title, toggleExpanded, expanded, children, bodyRef }) => (
  <div className={styles.root}>
    <button className={styles.header} onClick={toggleExpanded}>
      <FontAwesomeIcon
        icon={faChevronRight}
        className={cx(styles.activeIndicator, {
          [styles.active]: open,
        })}
      />
      {title}
    </button>
    <Collapse in={expanded}>
      <div className={styles.body} ref={bodyRef}>
        {children}
      </div>
    </Collapse>
  </div>
);

export default CollapsibleFieldSection;
