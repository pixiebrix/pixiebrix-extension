/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import optionsRegistry from "@/components/fields/optionsRegistry";
import PushOptions from "@/contrib/zapier/pushOptions";
import ProcessOptions from "@/contrib/uipath/processOptions";
import LocalProcessOptions from "@/contrib/uipath/localProcessOptions";
import AppendSpreadsheetOptions from "@/contrib/google/sheets/AppendSpreadsheetOptions";
import SheetServiceOptions, {
  SERVICE_GOOGLE_SHEET_ID,
} from "@/contrib/google/sheets/SheetServiceOptions";
import { ZAPIER_ID } from "@/contrib/zapier/push";
import { UIPATH_ID } from "@/contrib/uipath/process";
import { UIPATH_ID as LOCAL_UIPATH_ID } from "@/contrib/uipath/localProcess";
import { GOOGLE_SHEETS_API_ID } from "@/contrib/google/sheets/append";
import BotOptions from "@/contrib/automationanywhere/BotOptions";
import { AUTOMATION_ANYWHERE_RUN_BOT_ID } from "@/contrib/automationanywhere/run";

optionsRegistry.set(SERVICE_GOOGLE_SHEET_ID, SheetServiceOptions);
optionsRegistry.set(ZAPIER_ID, PushOptions);
optionsRegistry.set(UIPATH_ID, ProcessOptions);
optionsRegistry.set(LOCAL_UIPATH_ID, LocalProcessOptions);
optionsRegistry.set(GOOGLE_SHEETS_API_ID, AppendSpreadsheetOptions);
optionsRegistry.set(AUTOMATION_ANYWHERE_RUN_BOT_ID, BotOptions);
