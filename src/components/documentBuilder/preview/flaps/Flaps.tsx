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
import { DocumentElementType } from "@/components/documentBuilder/documentBuilderTypes";
import HoveredFlap from "./HoveredFlap";
import ActiveElementFlap from "./ActiveElementFlap";

type PopupLabelsProps = {
  className?: string;
  elementType: DocumentElementType;
  documentBodyName: string;
  elementName: string;
  isHovered: boolean;
  isActive: boolean;
};

const Flaps: React.FunctionComponent<PopupLabelsProps> = ({
  className,
  elementType,
  documentBodyName,
  elementName,
  isHovered,
  isActive,
}) => (
  <>
    {isHovered && (
      <HoveredFlap className={className} elementType={elementType} />
    )}
    {isActive && (
      <ActiveElementFlap
        className={className}
        documentBodyName={documentBodyName}
        elementName={elementName}
      />
    )}
  </>
);

export default Flaps;
