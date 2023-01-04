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

import React, { type PropsWithChildren } from "react";
import { type IconDefinition } from "@fortawesome/fontawesome-common-types";
import {
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Alert as BootstrapAlert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type AlertProps = PropsWithChildren<{
  variant: "info" | "warning" | "danger";
  className?: string;
}>;

const Alert: React.FunctionComponent<AlertProps> = ({
  variant,
  className,
  children,
}) => {
  let icon: IconDefinition;
  switch (variant) {
    case "info": {
      icon = faInfoCircle;
      break;
    }

    case "warning": {
      icon = faExclamationTriangle;
      break;
    }

    case "danger": {
      icon = faExclamationCircle;
      break;
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamically inferring never
      throw new Error(`Unknown variant: ${variant}`);
    }
  }

  return (
    <BootstrapAlert variant={variant} className={className}>
      <FontAwesomeIcon icon={icon} /> {children}
    </BootstrapAlert>
  );
};

export default Alert;
