import React from "react";
import { type NodeInfo } from "../../../../../pageEditor/store/editor/uiStateTypes";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import styles from "./SourceLabel.module.scss";
import { type TypedBrickMap } from "@/bricks/registry";

type SourceLabelProps = {
  source: string;
  extensionPointLabel: string;
  nodes: NodeInfo[];
  allBricks: TypedBrickMap;
};

const SourceLabel: React.FunctionComponent<SourceLabelProps> = ({
  source,
  extensionPointLabel,
  nodes,
  allBricks,
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

    case KnownSources.INTEGRATION: {
      label = "Integrations";
      break;
    }

    default: {
      const brickConfig = nodes.find((node) => node.path === source)
        ?.blockConfig;
      if (brickConfig == null) {
        label = source;
      } else {
        label =
          brickConfig.label ??
          allBricks.get(brickConfig.id)?.block?.name ??
          source;
      }
    }
  }

  return <div className={styles.label}>{label}</div>;
};

export default SourceLabel;
