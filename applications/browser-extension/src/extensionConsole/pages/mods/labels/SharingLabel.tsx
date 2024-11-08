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

import styles from "./SharingLabel.module.scss";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEyeSlash,
  faGlobe,
  faUsers,
  faQuestion,
  type IconDefinition,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { OverlayTrigger, Popover } from "react-bootstrap";
import cx from "classnames";
import { type SharingSource, type SharingType } from "../../../../types/modTypes";

const sharingIcons = {
  Personal: faEyeSlash,
  Team: faUsers,
  Public: faGlobe,
  Deployment: faUsers,
  PersonalDeployment: faEyeSlash,
  Unknown: faQuestion,
} satisfies Record<SharingType, IconDefinition>;

const getPopoverMessage = (sharing: SharingSource): string => {
  switch (sharing.type) {
    case "Personal": {
      return "You created this mod.";
    }

    case "Team": {
      return `This mod was shared with you by "${sharing.label}" team.`;
    }

    case "Public": {
      return "You activated this mod from the public marketplace.";
    }

    case "Deployment": {
      return `This mod was activated as a deployment from "${sharing.label}" team.`;
    }

    case "PersonalDeployment": {
      return "You created this mod, and it is synced to all devices.";
    }

    case "Unknown": {
      return "This mod originated from an unknown source.";
    }

    default: {
      const exhaustiveCheck: never = sharing.type;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
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
        <Popover.Content>{getPopoverMessage(sharing)}</Popover.Content>
      </Popover>
    }
  >
    <div className={cx(className, styles.root)}>
      {["Deployment", "PersonalDeployment"].includes(sharing.type) && (
        <FontAwesomeIcon icon={faDownload} />
      )}{" "}
      <FontAwesomeIcon icon={sharingIcons[sharing.type]} /> {sharing.label}
    </div>
  </OverlayTrigger>
);

export default SharingLabel;