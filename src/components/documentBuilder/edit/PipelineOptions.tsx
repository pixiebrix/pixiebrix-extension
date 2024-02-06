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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import React from "react";
import { joinPathParts } from "@/utils/formUtils";

type PipelineOptionsProps = {
  elementName: string;
};

const PipelineOptions: React.FC<PipelineOptionsProps> = ({ elementName }) => (
  <>
    <p>Use the Brick Actions Panel on the left to add and edit bricks.</p>
    <ConnectedFieldTemplate
      name={joinPathParts(elementName, "config", "label")}
      label="Pipeline name"
      description="The pipeline label displayed in the Brick Actions Panel"
    />
  </>
);

export default PipelineOptions;
