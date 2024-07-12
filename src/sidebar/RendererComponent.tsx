import React, { useMemo } from "react";
import { type PanelRunMeta } from "@/types/sidebarTypes";
import { type SubmitPanelAction } from "@/bricks/errors";
import { type RegistryId } from "@/types/registryTypes";
import { type RendererOutput } from "@/types/runtimeTypes";

/**
 * React component to display the output of a renderer brick
 * @see RendererOutput
 */
const RendererComponent: React.FunctionComponent<{
  onAction?: (action: SubmitPanelAction) => void;
  brickId?: RegistryId;
  body?: RendererOutput;
  meta?: PanelRunMeta;
}> = ({ body, meta, brickId, onAction }) =>
  useMemo(() => {
    if (!body) {
      return null;
    }

    if (typeof body === "string") {
      // This is safe because if body is a string it's a SafeHTML value
      return (
        <div
          style={{ height: "100%", overflow: "hidden" }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }

    const { Component, props } = body;

    // Enrich with metadata about the run
    const enrichedProps: UnknownObject =
      brickId === "@pixiebrix/document" ? { ...props, meta, onAction } : props;

    return <Component {...enrichedProps} />;
  }, [body, meta, brickId, onAction]);

export default RendererComponent;
