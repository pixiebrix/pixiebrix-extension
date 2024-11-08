import useEventListener from "../../hooks/useEventListener";
import { useCallback } from "react";

/**
 * Hook that calls a cancel callback when the used presses the Escape key.
 * @param cancel the cancel callback, called asynchronously
 * @param active true if the escape handler should be active
 */
export default function useEscapeHandler(
  cancel: () => void,
  active: boolean,
): void {
  const escapeHandler = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        cancel();
      }
    },
    [cancel],
  );

  useEventListener(document, "keydown", escapeHandler, { passive: !active });
}
