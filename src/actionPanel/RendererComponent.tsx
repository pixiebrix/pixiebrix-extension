import React, { useMemo } from "react";
import { RendererOutput } from "@/core";
import createDOMPurify, { DOMPurifyI } from "dompurify";

let DOMPurify: DOMPurifyI;

/**
 * React component to display the output of a renderer brick
 * @see RendererOutput
 */
const RendererComponent: React.FunctionComponent<{
  body: RendererOutput;
}> = ({ body }) =>
  useMemo(() => {
    if (typeof body === "string") {
      if (!DOMPurify) {
        DOMPurify = createDOMPurify(window);
      }

      return (
        <div
          style={{ height: "100%" }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
        />
      );
    }

    const { Component, props } = body;
    return <Component {...props} />;
  }, [body]);

export default RendererComponent;
