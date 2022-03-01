import { useCallback, useEffect } from "react";

/**
 * Hook that calls a cancel callback when the used presses the Escape key.
 * @param cancel the cancel callback, called asynchronously
 * @param active true if the escape handler should be active
 */
export default function useEscapeHandler(
  cancel: () => void,
  active: boolean
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
    [cancel]
  );

  useEffect(() => {
    // Needs to be the keydown event to prevent Google from opening the drawer
    if (active) {
      document.addEventListener("keydown", escapeHandler, true);
    } else {
      document.removeEventListener("keydown", escapeHandler);
    }

    return () => {
      document.removeEventListener("keydown", escapeHandler);
    };
  }, [active, cancel, escapeHandler]);
}
