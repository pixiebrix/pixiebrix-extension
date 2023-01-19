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

import React from "react";
import ErrorIcon from "@/icons/error.svg?loadAsComponent";
import WarningIcon from "@/icons/warning.svg?loadAsComponent";
import InfoIcon from "@/icons/info.svg?loadAsComponent";
import cx from "classnames";
import styles from "./FieldAnnotationAlert.module.scss";
import { isEmpty } from "lodash";
import AsyncButton from "@/components/AsyncButton";
import { AnnotationType } from "@/types";
import { type FieldAnnotation } from "@/components/form/FieldAnnotation";

const FieldAnnotationAlert: React.FunctionComponent<FieldAnnotation> = ({
  message,
  type,
  actions,
}) => {
  let Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  switch (type) {
    case AnnotationType.Error: {
      Icon = ErrorIcon;
      break;
    }

    case AnnotationType.Warning: {
      Icon = WarningIcon;
      break;
    }

    case AnnotationType.Info: {
      Icon = InfoIcon;
      break;
    }

    default: {
      throw new Error(`Unsupported annotation type: ${type}`);
    }
  }

  return (
    <div className={cx(styles.root, styles[type])}>
      {Icon && <Icon className={styles.icon} />}
      <div className={styles.message}>
        <span>{message}</span>
      </div>
      {!isEmpty(actions) && (
        <span>
          {actions.map(({ caption, action }) => (
            <AsyncButton key={caption} onClick={action}>
              {caption}
            </AsyncButton>
          ))}
        </span>
      )}
    </div>
  );
};

export default FieldAnnotationAlert;
