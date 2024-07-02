/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison -- It seems to be the correct option for now */
import React from "react";
import { type NodeInfo } from "@/pageEditor/uiState/uiStateTypes";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import styles from "./SourceLabel.module.scss";
import { type TypedBrickMap } from "@/bricks/registry";

type SourceLabelProps = {
  source: string;
  extensionPointLabel: string;
  blocksInfo: NodeInfo[];
  allBlocks: TypedBrickMap;
};

const SourceLabel: React.FunctionComponent<SourceLabelProps> = ({
  source,
  extensionPointLabel,
  blocksInfo,
  allBlocks,
}) => {
  const [kind] = source.split(":");
  let label: string;
  switch (kind) {
    case KnownSources.INPUT: {
      label = `Starter Brick: ${extensionPointLabel}`;
      break;
    }

    case KnownSources.OPTIONS: {
      label = "Mod Options";
      break;
    }

    case KnownSources.MOD: {
      label = "Mod Variables";
      break;
    }

    case KnownSources.SERVICE: {
      label = "Integrations";
      break;
    }

    default: {
      const blockConfig = blocksInfo.find((block) => block.path === source)
        ?.blockConfig;
      if (blockConfig == null) {
        label = source;
      } else {
        label =
          blockConfig.label ??
          allBlocks.get(blockConfig.id)?.block?.name ??
          source;
      }
    }
  }

  return <div className={styles.label}>{label}</div>;
};

export default SourceLabel;
