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
import { Card } from "react-bootstrap";
import { type ModViewItem } from "../../../../types/modTypes";
import ErrorBoundary from "../../../../components/ErrorBoundary";

import styles from "./GridCard.module.scss";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_TEXT_ICON_COLOR } from "../../../../icons/constants";

type Props = {
  /**
   * Where the error happened, a hint in a free form
   */
  errorContext?: string;

  modViewItem: ModViewItem;
};

class GridCardErrorBoundary extends ErrorBoundary<Props> {
  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.root}>
          <Card className={styles.card}>
            <Card.Body className={styles.cardBody}>
              <div className={styles.primaryInfo}>
                <div>
                  <h5 className={styles.name}>{this.props.modViewItem.name}</h5>
                  <span className={cx(styles.description, "text-muted")}>
                    An error occurred retrieving mod
                  </span>
                  <div className={styles.packageId}>
                    {this.props.modViewItem.modId}
                  </div>
                </div>
                <span className="mb-2">
                  <FontAwesomeIcon
                    icon={faExclamationCircle}
                    color={DEFAULT_TEXT_ICON_COLOR}
                    size="2x"
                    fixedWidth
                  />
                </span>
              </div>
              <div>
                <div className={styles.actions}></div>
              </div>
            </Card.Body>
            <Card.Footer className={styles.cardFooter}></Card.Footer>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GridCardErrorBoundary;
