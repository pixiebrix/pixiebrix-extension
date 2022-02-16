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
  allEntries: LogEntry[];

  /**
   * Log entries that have been selected for viewing (without pagination and filtering)
   */
  displayedEntries: LogEntry[];

  /**
   * Indicates the progress of the first loading from storage for the active context
   */
  isLoading: boolean;
};
