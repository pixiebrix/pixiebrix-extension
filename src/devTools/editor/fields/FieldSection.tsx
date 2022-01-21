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
import React from "react";
import { Card } from "react-bootstrap";
import styles from "./FieldSection.module.scss";

/**
 * A Page Editor edit tab field section.
 */
const FieldSection: React.FC<{
  title: string;
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
}> = ({ title, bodyRef, children }) => (
  <>
    <Card.Header className={styles.cardHeader}>{title}</Card.Header>
    <Card.Body className={styles.cardBody} ref={bodyRef}>
      {children}
    </Card.Body>
  </>
);

export default FieldSection;
