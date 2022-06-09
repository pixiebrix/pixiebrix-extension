import { useEffect, useState } from "react";

function useQuickbarShortcut(): {
  shortcut: string | null;
  isConfigured: boolean;
} {
  const [shortcut, setShortcut] = useState(null);

  useEffect(() => {
    chrome.commands.getAll((commands) => {
      const command = commands.find(
        (command) => command.name === "toggle-quick-bar"
      );
      if (command) {
        setShortcut(command.shortcut);
      }
    });
  }, []);

  const isConfigured = shortcut !== "";

  return {
    // Optimistically return as isConfigured so interface doesn't show a warning
    isConfigured: isConfigured || shortcut == null,
    shortcut: isConfigured ? shortcut : null,
  };
}

export default useQuickbarShortcut;
