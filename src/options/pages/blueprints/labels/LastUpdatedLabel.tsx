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
import styles from "./SharingLabel.module.scss";

import { OverlayTrigger, Popover } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import { timeSince } from "@/utils/timeUtils";
import React from "react";
import cx from "classnames";

const LastUpdatedLabel: React.VoidFunctionComponent<{
  timestamp: string;
  className?: string;
}> = ({ timestamp, className }) => {
  const timestampFormatted = new Date(timestamp).toLocaleString();

  return (
    <OverlayTrigger
      trigger="hover"
      key="updateAt"
      placement="top"
      delay={700}
      overlay={
        <Popover id={"updatedAtPopover"}>
          <Popover.Content>Last updated {timestampFormatted}</Popover.Content>
        </Popover>
      }
    >
      <span className={cx(className, styles.root)}>
        <FontAwesomeIcon icon={faClock} /> {timeSince(timestamp)}
      </span>
    </OverlayTrigger>
  );
};

export default LastUpdatedLabel;
