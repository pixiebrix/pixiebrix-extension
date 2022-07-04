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

import React from "react";
import { HashRouter as Router } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageEditorTabContext, useDevConnection } from "@/pageEditor/context";
import Editor from "@/pageEditor/Editor";
import store, { persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { useAsyncEffect } from "use-async-effect";
import blockRegistry from "@/blocks/registry";
import { ModalProvider } from "@/components/ConfirmationModal";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import registerEditors from "@/contrib/editors";
import ErrorBanner from "@/pageEditor/ErrorBanner";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import RequireAuth from "@/auth/RequireAuth";
import LoginCard from "./components/LoginCard";

// Register the built-in bricks
registerEditors();
registerContribBlocks();
registerBuiltinBlocks();

// Register Widgets
registerDefaultWidgets();

const Panel: React.VoidFunctionComponent = () => {
  const context = useDevConnection();

  useAsyncEffect(async () => {
    await blockRegistry.fetch();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <PageEditorTabContext.Provider value={context}>
          <ModalProvider>
            <ErrorBoundary>
              <Router>
                <ErrorBanner />
                <RequireAuth LoginPage={LoginCard}>
                  <Editor />
                </RequireAuth>
              </Router>
            </ErrorBoundary>
          </ModalProvider>
        </PageEditorTabContext.Provider>
      </PersistGate>
    </Provider>
  );
};

export default Panel;
