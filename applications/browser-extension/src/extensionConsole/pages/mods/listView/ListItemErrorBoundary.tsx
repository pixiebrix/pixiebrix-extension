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

import React from "react";
import { ListGroup } from "react-bootstrap";
import { type ModViewItem } from "../../../../types/modTypes";

import styles from "./ListItem.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import ErrorBoundary from "../../../../components/ErrorBoundary";
import { DEFAULT_TEXT_ICON_COLOR } from "../../../../icons/constants";

type Props = {
  /**
   * Where the error happened, a hint in a free form
   */
  errorContext?: string;

  modViewItem: ModViewItem;

  style: React.CSSProperties;
};

class ListItemErrorBoundary extends ErrorBoundary<Props> {
  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ListGroup.Item className={styles.root} style={this.props.style}>
          <div className={styles.icon}>
            <FontAwesomeIcon
              icon={faExclamationCircle}
              color={DEFAULT_TEXT_ICON_COLOR}
              size="2x"
              fixedWidth
            />
          </div>
          <div className={styles.primaryInfo}>
            <h5 className={styles.name}>{this.props.modViewItem.name}</h5>
            <p className={cx(styles.description, "text-muted")}>
              An error occurred retrieving mod
            </p>
            <div className={styles.packageId}>
              {this.props.modViewItem.modId}
            </div>
          </div>
          <div className="flex-shrink-0"></div>
          <div className={styles.status}></div>
          <div className="flex-shrink-0"></div>
        </ListGroup.Item>
      );
    }

    return this.props.children;
  }
}

export default ListItemErrorBoundary;
