/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

function castError(err: unknown, defaultMessage?: string): Error {
  try {
    if (err instanceof Error) {
      return err;
    }

    if (err == null) {
      return new Error(defaultMessage);
    }

    if (typeof err === "object") {
      return new Error(JSON.stringify(err));
    }

    return new Error(String(err));
  } catch {
    return new Error(
      `Error casting error: ${defaultMessage}, type: ${typeof err}`,
    );
  }
}

export default castError;
