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
import { Accordion, AccordionContext, Card } from "react-bootstrap";
import styles from "./FieldSection.module.scss";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";

/**
 * A Page Editor edit tab field section.
 */
const FieldSection: React.FC<{
  title: React.ReactNode;
  variant?: "base" | "accordion";
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
}> = ({ variant = "base", children, ...rest }) => (
  <SectionVariants variant={variant} {...rest}>
    {children}
  </SectionVariants>
);

function SectionVariants({
  variant,
  title,
  children,
  bodyRef,
}: {
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
  variant: "base" | "accordion";
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  switch (variant) {
    case "accordion": {
      return (
        <Accordion>
          <StyledToggle title={title} />
          <Accordion.Collapse eventKey="0">
            <Card.Body>{children}</Card.Body>
          </Accordion.Collapse>
        </Accordion>
      );
    }

    default: {
      return (
        <>
          <Card.Header className={styles.cardHeader}>{title}</Card.Header>
          <Card.Body className={styles.cardBody} ref={bodyRef}>
            {children}
          </Card.Body>
        </>
      );
    }
  }
}

// Accordion toggle card header with chevron to indicate open or not
function StyledToggle({ title }: { title: React.ReactNode }) {
  const currentEventKey = useContext(AccordionContext);

  return (
    <Accordion.Toggle as={Card.Header} eventKey="0">
      <div
        className={cx(styles.accordionIndicator, {
          [styles.active]: currentEventKey === "0",
        })}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </div>
      {title}
    </Accordion.Toggle>
  );
}

export default FieldSection;
