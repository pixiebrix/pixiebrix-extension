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

import * as sinonTimers from "@sinonjs/fake-timers";
import AsyncAnalysisQueue from "./asyncAnalysisQueue";

let clock: sinonTimers.InstalledClock;
let queue: AsyncAnalysisQueue;

beforeAll(() => {
  clock = sinonTimers.install();
});

beforeEach(() => {
  queue = new AsyncAnalysisQueue();
  clock.reset();
});

afterAll(() => {
  clock.uninstall();
});

test("runs the tasks", async () => {
  const task1 = jest.fn();
  const task2 = jest.fn();
  const task3 = jest.fn();

  queue.enqueue(task1);
  queue.enqueue(task2);
  queue.enqueue(task3);

  // This will advance the clock so all 3 promises for the tasks are resolved
  await clock.tickAsync(2);

  expect(task1).toHaveBeenCalled();
  expect(task2).toHaveBeenCalled();
  expect(task3).toHaveBeenCalled();
});

test("allows to squeeze work between tasks", async () => {
  const work = jest.fn().mockResolvedValue(true);

  queue.enqueue(() => work("task1"));
  queue.enqueue(() => work("task2"));

  // Imitate interruption (a keypress handler, for example)
  setTimeout(() => {
    work("interrupted");
  }, 0);

  await clock.tickAsync(3);

  expect(work).toHaveBeenNthCalledWith(1, "task1");

  // The interruption happened between the first and second tasks
  expect(work).toHaveBeenNthCalledWith(2, "interrupted");

  expect(work).toHaveBeenNthCalledWith(3, "task2");
});

test("continues processing the queue after error", async () => {
  const task1 = () => {
    throw new Error("task1 failed");
  };

  const task2 = jest.fn();

  queue.enqueue(task1);
  queue.enqueue(task2);

  await clock.tickAsync(1);

  expect(task2).toHaveBeenCalled();
});
