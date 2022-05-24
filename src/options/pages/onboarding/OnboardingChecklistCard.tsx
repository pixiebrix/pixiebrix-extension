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

import React from "react";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { Card, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./OnboardingChecklistCard.module.scss";
import cx from "classnames";

export const OnboardingStep: React.FunctionComponent<{
  number: number;
  title?: string;
  completed?: boolean;
  active?: boolean;
}> = ({ number, title, completed, active, children }) => {
  const circleIconStyle = completed
    ? styles.circleIconSuccess
    : active
    ? styles.circleIconActive
    : styles.circleIconDefault;

  const notStarted = !completed && !active;

  return (
    <ListGroup.Item
      className={cx(
        styles.checklistItem,
        !active && !completed && styles.futureStep
      )}
    >
      <div
        className={cx(styles.checklistItemLayout, active ?? styles.inactive)}
      >
        <div>
          <span className={cx(styles.circleIcon, circleIconStyle)}>
            {completed && <FontAwesomeIcon icon={faCheck} />}
          </span>
        </div>
        <div>
          <div className={styles.stepNumber}>Step {number}</div>
          <div>
            {title && <h3 className={styles.stepTitle}>{title}</h3>}
            {children && !(notStarted || completed) && (
              <div className={title && styles.titlePadding}>{children}</div>
            )}
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const OnboardingChecklistCard: React.FunctionComponent = ({ children }) => {
  return <Card className={styles.checklistCard}>{children}</Card>;
};

export default OnboardingChecklistCard;
