import { LogEntry } from "@/background/logging";
import { MessageContext } from "@/core";

export type LogState = {
  /**
   * The selected context for Logs
   */
  activeContext: MessageContext | null;

  /**
   * All available log entries
   */
  availableEntries: LogEntry[];

  /**
   * Log entries that have been selected for viewing (without pagination and filtering)
   */
  entries: LogEntry[];

  /**
   * Indicates the progress of the first loading from storage for the active context
   */
  isLoading: boolean;
};

export type LogRootState = {
  logs: LogState;
};
