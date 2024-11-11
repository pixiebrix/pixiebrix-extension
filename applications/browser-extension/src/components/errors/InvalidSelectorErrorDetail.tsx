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
import {
  type NoElementsFoundError,
  type MultipleElementsFoundError,
} from "@/errors/businessErrors";
import styles from "./ErrorDetail.module.scss";

const InvalidSelectorErrorDetail: React.FunctionComponent<{
  error: MultipleElementsFoundError | NoElementsFoundError;
}> = ({ error: { message, selector } }) => (
  <div className={styles.root}>
    <div className={styles.column}>
      <h5>Error</h5>
      <p>{message}</p>
    </div>
    <div className={styles.column}>
      <h5>Selector</h5>
      <p>{selector}</p>
    </div>
  </div>
);

export default InvalidSelectorErrorDetail;
