import { Logger } from "./loggerTypes";

export class MutedLogger implements Logger {
  debug() {}

  log() {}

  warn() {}

  error() {}
}
