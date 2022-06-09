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
import { OutputKey } from "@/core";
import styles from "./OutputKeyView.module.scss";
import cx from "classnames";

const OutputKeyView: React.VFC<{
  outputKey: OutputKey;
  className?: string;
}> = ({ outputKey, className }) =>
  outputKey ? (
    <div className={cx(styles.root, className)}>@{outputKey}</div>
  ) : null;

export default OutputKeyView;
