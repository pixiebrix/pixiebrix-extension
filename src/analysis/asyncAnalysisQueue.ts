/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { noop } from "lodash";

class AsyncAnalysisQueue {
  private readonly queue: Array<() => Promise<void>> = [];

  constructor(readonly onTaskError: (error: unknown) => void = noop) {}

  /**
   * Add a task to the queue. Initiate processing if the queue was empty (the task will be added to the end of event loop).
   * @param task a function that returns a promise. The promise will be awaited before the next task is processed.
   */
  public enqueue(task: () => Promise<void>): void {
    this.queue.push(task);

    if (this.queue.length === 1) {
      this.processNextTask();
    }
  }

  private processNextTask(): void {
    setTimeout(async () => {
      const task = this.queue.shift();
      try {
        await task();
      } catch (error) {
        this.onTaskError(error);
      }

      if (this.queue.length > 0) {
        this.processNextTask();
      }
    }, 0);
  }
}

export default AsyncAnalysisQueue;
