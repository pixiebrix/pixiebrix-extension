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
      className={cx(styles.checklistItem, {
        [styles.futureStep]: !active && !completed,
      })}
    >
      <div
        className={cx(styles.checklistItemLayout, {
          [styles.inactive]: !active,
        })}
      >
        <div>
          <span className={cx(styles.circleIcon, circleIconStyle)}>
            {completed && <FontAwesomeIcon icon={faCheck} />}
          </span>
        </div>
        <div className={styles.stepDescription}>
          <div className={styles.stepNumber}>Step {number}</div>
          <div>
            {title && <h3 className={styles.stepTitle}>{title}</h3>}
            {children && !notStarted && !completed && (
              <div className={cx({ [styles.stepBody]: Boolean(title) })}>
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const OnboardingChecklistCard: React.FunctionComponent<{
  title?: string;
}> = ({ title, children }) => {
  const checklistCard = (
    <Card className={styles.checklistCard}>
      <ListGroup>{children}</ListGroup>
    </Card>
  );

  if (title) {
    return (
      <div>
        <h1 className={styles.onboardingTitle}>{title}</h1>
        {checklistCard}
      </div>
    );
  }

  return checklistCard;
};

export default OnboardingChecklistCard;
