// Vendored from https://github.com/timc1/kbar/blob/805b6ad442124a3ab9ed4c4c1292ac8ce4c50a8d/src/KBarAnimator.tsx
// Changes: Add support for Shadow DOM https://github.com/timc1/kbar/issues/172

import * as React from "react";

export function useOuterClick(
  dom: React.RefObject<HTMLElement>,
  cb: () => void
) {
  const cbRef = React.useRef(cb);
  cbRef.current = cb;

  React.useEffect(() => {
    function handler(event: Event) {
      if (
        dom.current?.contains(event.target as Node) ||
        // @ts-expect-error wrong types, the `host` property exists https://stackoverflow.com/a/25340456
        event.target === dom.current?.getRootNode().host
      ) {
        return;
      }
      cbRef.current();
    }
    ["mousedown", "touchstart"].forEach((ev) => {
      window.addEventListener(ev, handler, true);
    });
    return () =>
      ["mousedown", "touchstart"].forEach((ev) =>
        window.removeEventListener(ev, handler, true)
      );
  }, [dom]);
}
