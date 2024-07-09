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

import React, { useRef } from "react";
import { Collapse } from "react-bootstrap";
import styles from "@/pageEditor/fields/CollapsibleFieldSection.module.scss";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

export const UncollapsibleFieldSection: React.FC<{
  title: React.ReactNode;
}> = ({ title, children }) => (
  <div className={styles.root}>
    <div className={styles.header}>{title}</div>
    <div className={styles.body}>{children}</div>
  </div>
);

const CollapsibleFieldSection: React.FC<{
  title: React.ReactNode;
  toggleExpanded: () => void;
  expanded?: boolean;
  bodyRef?: React.MutableRefObject<HTMLDivElement | null>;
}> = ({ title, toggleExpanded, expanded, children, bodyRef }) => {
  const headerRef = useRef<HTMLButtonElement | null>(null);

  const onToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent toggle on titles that include other clickable elements, e.g., inputs/buttons when the title is passed
    // as a ReactNode
    if (
      event.target === headerRef.current ||
      !["BUTTON", "INPUT"].includes((event.target as HTMLElement).tagName)
    ) {
      toggleExpanded();
    }
  };

  return (
    <div className={styles.root} aria-expanded={expanded}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        ref={headerRef}
        aria-expanded={expanded}
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={cx(styles.activeIndicator, {
            [styles.active ?? ""]: expanded,
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
};

export default CollapsibleFieldSection;
