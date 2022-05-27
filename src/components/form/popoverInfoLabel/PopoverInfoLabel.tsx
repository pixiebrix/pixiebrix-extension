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
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import styles from "./PopoverInfoLabel.module.scss";

const PopoverInfoLabel: React.FC<{
  name: string;
  label: string;
  description: string;
}> = ({ name, label, description }) => {
  const renderTooltip = (props: unknown) => (
    <Tooltip id={`${name}-tooltip`} {...props}>
      {description}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}
    >
      {({ ref, ...rest }) => (
        <span className={styles.span} {...rest}>
          <span className={styles.label}>{label}</span>{" "}
          <FontAwesomeIcon forwardedRef={ref} icon={faInfoCircle} />
        </span>
      )}
    </OverlayTrigger>
  );
};

export default PopoverInfoLabel;
