/* eslint-disable unicorn/filename-case */
/* eslint-disable filenames/match-exported */

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
 *
 */

const reactRedux = jest.createMockFromModule("react-redux");

export const useDispatch = jest.fn(() => jest.fn());
export const connect = jest.fn(() => jest.fn());
export const useSelector = jest.fn();

export default reactRedux;
