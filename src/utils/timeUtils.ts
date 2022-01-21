/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

export function timeSince(date: number): string {
  // Adapted from: https://stackoverflow.com/a/3177838/402560
  const seconds = Math.floor((Date.now() - date) / 1000);

  let interval = seconds / 31_536_000;

  if (interval > 1) {
    return `${Math.floor(interval)} years`;
  }

  interval = seconds / 2_592_000;
  if (interval > 1) {
    return `${Math.floor(interval)} months`;
  }

  interval = seconds / 86_400;
  if (interval > 1) {
    return `${Math.floor(interval)} days`;
  }

  interval = seconds / 3600;
  if (interval > 1) {
    return `${Math.floor(interval)} hours`;
  }

  interval = seconds / 60;
  if (interval > 1) {
    return `${Math.floor(interval)} minutes`;
  }

  return `${Math.floor(seconds)} seconds`;
}
