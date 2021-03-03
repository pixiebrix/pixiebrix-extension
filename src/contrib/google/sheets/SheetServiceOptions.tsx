/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useState } from "react";
import { BlockOptionProps } from "@/components/fields/blockOptions";
import { Schema } from "@/core";
import { SheetMeta } from "@/contrib/google/sheets/types";
import FileField from "@/contrib/google/sheets/FileField";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";

export const SERVICE_GOOGLE_SHEET_ID = "google/sheet";

const SheetServiceOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
}) => {
  const [doc, setDoc] = useState<SheetMeta>(null);
  return (
    <div className="my-2">
      <FileField
        name={`${name}.spreadsheetId`}
        schema={APPEND_SCHEMA.properties.spreadsheetId as Schema}
        doc={doc}
        onSelect={setDoc}
      />
    </div>
  );
};

export default SheetServiceOptions;
