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
