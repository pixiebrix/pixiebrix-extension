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

import React, { useContext } from "react";
import { Accordion, AccordionContext } from "react-bootstrap";
import styles from "@/pageEditor/fields/AccordionFieldSection.module.scss";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const AccordionFieldSection: React.FC<{
  title: React.ReactNode;
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
}> = ({ title, children, bodyRef }) => (
  <Accordion className={styles.root}>
    <StyledToggle title={title} />
    <Accordion.Collapse eventKey="0">
      <div className={styles.body} ref={bodyRef}>
        {children}
      </div>
    </Accordion.Collapse>
  </Accordion>
);

function StyledToggle({ title }: { title: React.ReactNode }) {
  const currentEventKey = useContext(AccordionContext);

  return (
    <Accordion.Toggle as="div" className={styles.header} eventKey="0">
      <FontAwesomeIcon
        icon={faChevronRight}
        className={cx(styles.activeIndicator, {
          [styles.active]: currentEventKey === "0",
        })}
      />
      {title}
    </Accordion.Toggle>
  );
}

export default AccordionFieldSection;
