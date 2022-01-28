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

import React, { useMemo } from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { SheetMeta } from "@/contrib/google/sheets/types";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { sheets } from "@/background/messenger/api";
import { compact, uniq } from "lodash";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { Expression } from "@/core";
import { isExpression } from "@/runtime/mapArgs";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";

const TabField: React.FunctionComponent<
  SchemaFieldProps & { doc: SheetMeta | null }
> = ({ name, doc }) => {
  const [field] = useField<string | Expression>(name);

  const [tabNames, tabsPending, tabsError] = useAsyncState(async () => {
    if (doc?.id) {
      return sheets.getTabNames(doc.id);
    }

    return [];
  }, [doc?.id]);

  const sheetOptions = useMemo(
    () =>
      uniq(compact([...(tabNames ?? []), field.value])).map((value) => ({
        label: value,
        value,
      })),
    [tabNames, field.value]
  );

  // TODO: re-add info message that tab will be created
  // {!tabsPending &&
  // !isNullOrBlank(field.value) &&
  // !tabNames.includes(field.value) &&
  // doc != null && (
  //   <span className="text-info small">
  //           Tab does not exist in the sheet, it will be created
  //         </span>
  // )}

  return isExpression(field.value) ? (
    <WorkshopMessageWidget />
  ) : (
    <ConnectedFieldTemplate
      name={name}
      label="Tab Name"
      description="The spreadsheet tab"
      as={SelectWidget}
      blankValue={null}
      loadError={tabsError}
      isLoading={tabsPending}
      options={sheetOptions}
      loadingMessage="Fetching sheet names..."
    />
  );
};

export default TabField;
