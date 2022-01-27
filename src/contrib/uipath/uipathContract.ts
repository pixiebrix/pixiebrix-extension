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

export type Argument = {
  name: string;
  type: string;
  required: boolean;
  hasDefault: boolean;
};

export type ODataResponseData<TValue> = {
  "@odata.context": string;
  "@odata.count": number;
  value: TValue[];
};

export type Robot = {
  MachineName: string;
  MachineId: number;
  Name: string;
  Username: string;
  Description: string;
  Type: string;
  Id: number;
};

export type Release = {
  Key: string;
  ProcessKey: string;
  ProcessVersion: string;
  IsLatestVersion: boolean;
  Description: string;
  Name: string;
  Arguments: {
    // Serialized input dict
    Input: string | null;
    Output: string | null;
  };
};
