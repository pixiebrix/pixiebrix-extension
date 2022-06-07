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
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./EditorNodeContent.module.scss";

export enum RunStatus {
  NONE,
  SUCCESS,
  SKIPPED,
  WARNING,
  ERROR,
}

export type EditorNodeContentProps = {
  title: string;
  outputKey?: string;
  icon?: IconProp | React.ReactNode;
  runStatus?: RunStatus;
};

function isFontAwesomeIcon(
  maybeIcon: IconProp | React.ReactNode
): maybeIcon is IconProp {
  return (
    typeof maybeIcon === "string" ||
    (typeof maybeIcon === "object" && "icon" in maybeIcon)
  );
}

const EditorNodeContent: React.FC<EditorNodeContentProps> = ({
  title,
  outputKey,
  icon: iconProp,
  runStatus,
}) => {
  const outputName = outputKey ? `@${outputKey}` : "";
  const icon = isFontAwesomeIcon(iconProp) ? (
    <FontAwesomeIcon icon={iconProp as IconProp} size="2x" fixedWidth />
  ) : (
    iconProp
  );

  let badgeSource: string;

  switch (runStatus) {
    case RunStatus.SUCCESS:
      badgeSource = "/img/fa-check-circle-solid-custom.svg";
      break;
    case RunStatus.SKIPPED:
      badgeSource = "/img/fa-minus-circle-solid-custom.svg";
      break;
    case RunStatus.WARNING:
      badgeSource = "/img/fa-exclamation-triangle-custom.svg";
      break;
    case RunStatus.ERROR:
      badgeSource = "/img/fa-exclamation-circle-custom.svg";
      break;
    default:
      badgeSource = null;
  }

  const badge = badgeSource ? (
    <span className={styles.badge}>
      <img src={badgeSource} alt="" />
    </span>
  ) : null;

  return (
    <>
      <div className={styles.icon}>
        {icon}
        {badge}
      </div>
      <div className={styles.text}>
        <div>{title}</div>
        {outputName && <div className={styles.outputKey}>{outputName}</div>}
      </div>
    </>
  );
};

export default EditorNodeContent;
