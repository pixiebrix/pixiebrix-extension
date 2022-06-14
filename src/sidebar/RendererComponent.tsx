import React, { useMemo } from "react";
import { RendererOutput } from "@/core";
import { UnknownObject } from "@/types";
import { PanelRunMeta } from "@/sidebar/types";

/**
 * React component to display the output of a renderer brick
 * @see RendererOutput
 */
const RendererComponent: React.FunctionComponent<{
  body: RendererOutput;
  meta: PanelRunMeta;
}> = ({ body, meta }) =>
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
    const enrichedProps: UnknownObject = { ...props, meta };
    return <Component {...enrichedProps} />;
  }, [body, meta]);

export default RendererComponent;
