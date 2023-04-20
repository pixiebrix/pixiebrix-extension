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

/**
 * If a string contains an emoji, returns an object that contains the separated emoji and the remaining string.
 * @param string
 */
export function splitStartingEmoji(string: string) {
  const emojiRegex = /^(\p{Emoji})?(.*)/u;
  const match = emojiRegex.exec(string);
  return {
    startingEmoji: match[1],
    rest: match[2],
  };
}
