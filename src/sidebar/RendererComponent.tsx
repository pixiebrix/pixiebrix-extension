import React, { useMemo } from "react";
import { type RegistryId, type RendererOutput } from "@/core";
import { type UnknownObject } from "@/types";
import { type PanelRunMeta } from "@/sidebar/types";
import { type SubmitPanelAction } from "@/blocks/errors";

/**
 * React component to display the output of a renderer brick
 * @see RendererOutput
 */
const RendererComponent: React.FunctionComponent<{
  onAction?: (action: SubmitPanelAction) => void;
  blockId: RegistryId;
  body: RendererOutput;
  meta: PanelRunMeta;
}> = ({ body, meta, blockId, onAction }) =>
  useMemo(() => {
    if (typeof body === "string") {
      // This is safe because if body is a string it's a SafeHTML value
      return (
        <div
          style={{ height: "100%" }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }

    const { Component, props } = body;

    // Enrich with metadata about the run
    const enrichedProps: UnknownObject =
      blockId === "@pixiebrix/document" ? { ...props, meta, onAction } : props;

    return <Component {...enrichedProps} />;
  }, [body, meta, blockId, onAction]);

export default RendererComponent;
