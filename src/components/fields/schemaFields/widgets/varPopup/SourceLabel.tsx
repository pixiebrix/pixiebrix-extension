import React from "react";
import { BlockInfo } from "@/pageEditor/uiState/uiStateTypes";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import styles from "./SourceLabel.module.scss";
import { TypedBlockMap } from "@/blocks/registry";

type SourceLabelProps = {
  source: string;
  extensionPointLabel: string;
  blocksInfo: BlockInfo[];
  allBlocks: TypedBlockMap;
};

const SourceLabel: React.FunctionComponent<SourceLabelProps> = ({
  source,
  extensionPointLabel,
  blocksInfo,
  allBlocks,
}) => {
  let label: string;
  if (source.includes(":")) {
    const [kind] = source.split(":");
    switch (kind) {
      case KnownSources.INPUT: {
        label = extensionPointLabel;
        break;
      }

      case KnownSources.OPTIONS: {
        label = "Blueprint Options";
        break;
      }

      case KnownSources.SERVICE: {
        label = "Services";
        break;
      }

      default: {
        label = source;
      }
    }
  } else {
    const blockConfig = blocksInfo.find(
      (block) => block.path === source
    )?.blockConfig;
    if (blockConfig == null) {
      label = source;
    } else {
      label =
        blockConfig.label ??
        allBlocks.get(blockConfig.id)?.block?.name ??
        source;
    }
  }

  return <div className={styles.label}>{label}</div>;
};

export default SourceLabel;
