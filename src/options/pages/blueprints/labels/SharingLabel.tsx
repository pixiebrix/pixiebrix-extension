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

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEyeSlash,
  faGlobe,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { OverlayTrigger, Popover } from "react-bootstrap";
import cx from "classnames";
import { SharingSource } from "@/options/pages/blueprints/blueprintsTypes";

const sharingIcons = {
  Personal: faEyeSlash,
  Team: faUsers,
  Public: faGlobe,
  Deployment: faUsers,
};

// Omitted OverlayTrigger attributes aren't required
// noinspection RequiredAttributes
const SharingLabel: React.VoidFunctionComponent<{
  sharing: SharingSource;
  className?: string;
}> = ({ sharing, className }) => (
  <OverlayTrigger
    key="updateAt"
    placement="top"
    delay={600}
    overlay={
      <Popover id="sharingLabelPopover">
        <Popover.Content>
          {sharing.type === "Personal" && "You created this blueprint."}
          {sharing.type === "Team" &&
            `This blueprint was shared with you by "${sharing.label}" team.`}
          {sharing.type === "Public" &&
            "You activated this blueprint from the public marketplace."}
        </Popover.Content>
      </Popover>
    }
  >
    <div className={cx(className, styles.root)}>
      <FontAwesomeIcon icon={sharingIcons[sharing.type]} /> {sharing.label}
    </div>
  </OverlayTrigger>
);

export default SharingLabel;
