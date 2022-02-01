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

import React, { useState } from "react";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import FileWidget from "@/contrib/google/sheets/FileWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { validateRegistryId } from "@/types/helpers";
import { SheetMeta } from "@/contrib/google/sheets/types";

export const SERVICE_GOOGLE_SHEET_ID = validateRegistryId("google/sheet");

const SheetServiceOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
}) => {
  const [doc, setDoc] = useState<SheetMeta>(null);

  return (
    <div className="my-2">
      <ConnectedFieldTemplate
        name={`${name}.spreadsheetId`}
        description="The ID of the spreadsheet to update."
        label="Google Sheet"
        as={FileWidget}
        onSelect={setDoc}
        doc={doc}
      />
    </div>
  );
};

export default SheetServiceOptions;
