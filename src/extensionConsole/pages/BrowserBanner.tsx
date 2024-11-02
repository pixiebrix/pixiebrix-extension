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

import React from "react";
import { type RootState } from "@/extensionConsole/store";
import { selectBrowserWarningDismissed } from "@/store/settings/settingsSelectors";
import Banner from "@/components/banner/Banner";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "react-bootstrap";
import settingsSlice from "@/store/settings/settingsSlice";

import { isOfficiallySupportedBrowser } from "@/utils/browserUtils";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";

const BrowserBanner: React.FC = () => {
  const dispatch = useDispatch();

  const browserWarningDismissed = useSelector<RootState, boolean>(
    selectBrowserWarningDismissed,
  );

  const enterpriseState = useManagedStorageState();

  if (
    browserWarningDismissed ||
    isOfficiallySupportedBrowser() ||
    enterpriseState.isLoading ||
    enterpriseState.data?.disableBrowserWarning
  ) {
    return null;
  }

  return (
    <Banner variant="warning">
      PixieBrix officially supports Google Chrome and Microsoft Edge. Some
      functionality may not be available on your browser.
      <Button
        className="info ml-3"
        size="sm"
        onClick={() => {
          dispatch(settingsSlice.actions.dismissBrowserWarning());
        }}
      >
        OK
      </Button>
    </Banner>
  );
};

export default BrowserBanner;
