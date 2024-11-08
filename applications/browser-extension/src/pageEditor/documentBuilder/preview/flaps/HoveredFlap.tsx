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
import { type DocumentBuilderElementType } from "../../documentBuilderTypes";
import documentBuilderElementTypeLabels from "../../elementTypeLabels";
import cx from "classnames";
import flapStyles from "./Flaps.module.scss";

type HoveredFlapProps = {
  className?: string;
  elementType: DocumentBuilderElementType;
};

const HoveredFlap: React.FunctionComponent<HoveredFlapProps> = ({
  className,
  elementType,
}) => (
  <div className={cx(flapStyles.root, className)}>
    {documentBuilderElementTypeLabels[elementType]}
  </div>
);

export default HoveredFlap;
