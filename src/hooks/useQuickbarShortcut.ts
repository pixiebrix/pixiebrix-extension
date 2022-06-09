import { useEffect, useState } from "react";
import { isEmpty } from "lodash";

const NO_SHORTCUT = "";

function useQuickbarShortcut(): {
  shortcut: string | null;
  isConfigured: boolean;
} {
  const [shortcut, setShortcut] = useState(NO_SHORTCUT);

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

  const isConfigured = !isEmpty(shortcut);

  return {
    isConfigured,
    shortcut: isConfigured ? shortcut : null,
  };
}

export default useQuickbarShortcut;
