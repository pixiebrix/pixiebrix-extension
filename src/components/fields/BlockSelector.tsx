/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useMemo } from "react";
import Select from "react-select";
import { IBlock } from "@/core";

interface BlockOption {
  value: string;
  label: string;
  block: IBlock;
}

const BlockSelector: React.FunctionComponent<{
  onSelect: (service: IBlock) => void;
  blocks: IBlock[];
  placeholder?: string;
}> = ({ onSelect, blocks, ...props }) => {
  const blockOptions = useMemo(
    () =>
      (blocks ?? []).map((x) => ({
        value: x.id,
        label: x.name,
        block: x,
      })),
    [blocks]
  );

  return (
    <Select
      key={Math.random()}
      options={blockOptions}
      onChange={(x: BlockOption) => onSelect(x.block)}
      {...props}
    />
  );
};

export default BlockSelector;
