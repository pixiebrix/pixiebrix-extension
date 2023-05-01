import React from "react";
import { type BlockInfo } from "@/pageEditor/uiState/uiStateTypes";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import styles from "./SourceLabel.module.scss";
import { type TypedBlockMap } from "@/blocks/registry";

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
  const [kind] = source.split(":");
  let label: string;
  if (
    [KnownSources.INPUT, KnownSources.OPTIONS, KnownSources.SERVICE].includes(
      kind as KnownSources
    )
  ) {
    switch (kind) {
      case KnownSources.INPUT: {
        label = extensionPointLabel;
        break;
      }

      case KnownSources.OPTIONS: {
        label = "Mod Options";
        break;
      }

      case KnownSources.SERVICE: {
        label = "Integrations";
        break;
      }

      default: {
        throw new Error(`Unexpected kind: ${kind}`);
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
