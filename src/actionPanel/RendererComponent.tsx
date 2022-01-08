import React, { useMemo } from "react";
import { RendererOutput } from "@/core";

/**
 * React component to display the output of a renderer brick
 * @see RendererOutput
 */
const RendererComponent: React.FunctionComponent<{
  body: RendererOutput;
}> = ({ body }) =>
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
    return <Component {...props} />;
  }, [body]);

export default RendererComponent;
