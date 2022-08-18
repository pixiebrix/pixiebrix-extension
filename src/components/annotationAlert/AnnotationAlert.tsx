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
import ErrorIcon from "@/icons/error.svg?loadAsComponent";
import { AnnotationType } from "@/analysis/analysisTypes";
import cx from "classnames";
import styles from "./AnnotationAlert.module.scss";

type AnnotationAlertProps = {
  message: string;
  type: AnnotationType;
};

const AnnotationAlert: React.FunctionComponent<AnnotationAlertProps> = ({
  message,
  type,
}) => {
  let Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  switch (type) {
    case AnnotationType.Error:
      Icon = ErrorIcon;
      break;

    case AnnotationType.Info:
      Icon = null;
      break;

    default:
      throw new Error(`Unsupported annotation type: ${type}`);
  }

  return (
    <div className={cx(styles.root, styles[type])}>
      {Icon && <Icon className={styles.icon} />}
      <div className={styles.message}>{message}</div>
    </div>
  );
};

export default AnnotationAlert;
