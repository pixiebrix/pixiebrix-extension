/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import "regenerator-runtime/runtime";
import "core-js/stable";
import React, { useMemo, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { HashRouter as Router } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { connectDevtools } from "@/devTools/protocol";
import { DevToolsContext } from "@/devTools/context";
import { GridLoader } from "react-spinners";
import useAsyncEffect from "use-async-effect";
import Editor from "@/devTools/Editor";

import "@/vendors/theme/app/app.scss";
import "@/vendors/overrides.scss";

const Panel: React.FunctionComponent = () => {
  const [port, setPort] = useState(null);

  useAsyncEffect(async (isMounted) => {
    const port = await connectDevtools();
    if (!isMounted) return;
    setPort(port);
  }, []);

  const context = useMemo(() => ({ port }), [port]);

  if (!context.port) {
    return <GridLoader />;
  }

  return (
    <DevToolsContext.Provider value={context}>
      <ErrorBoundary>
        <Router>
          <Container fluid>
            <Row>
              <Col>
                <Editor />
                {/*<Col lg="1">*/}
                {/*  <Nav id="sidebar" className="flex-column">*/}
                {/*    <IndexLinkContainer to="editor">*/}
                {/*      <Nav.Link href="#/editor">Edit</Nav.Link>*/}
                {/*    </IndexLinkContainer>*/}
                {/*    <IndexLinkContainer to="locator">*/}
                {/*      <Nav.Link href="#/locator">Locate</Nav.Link>*/}
                {/*    </IndexLinkContainer>*/}
                {/*    /!*<IndexLinkContainer to="reader">*!/*/}
                {/*    /!*  <Nav.Link href="#/reader">Read</Nav.Link>*!/*/}
                {/*    /!*</IndexLinkContainer>*!/*/}
                {/*  </Nav>*/}
                {/*</Col>*/}
                {/*<Col>*/}
                {/*  <Switch>*/}
                {/*    <Route exact path="/editor">*/}
                {/*      <Editor />*/}
                {/*    </Route>*/}
                {/*    <Route exact path="/locator">*/}
                {/*      <Locator />*/}
                {/*    </Route>*/}
                {/*    /!*<Route exact path="/reader">*!/*/}
                {/*    /!*  <Reader />*!/*/}
                {/*    /!*</Route>*!/*/}
                {/*    <Route>*/}
                {/*      <Locator />*/}
                {/*    </Route>*/}
                {/*  </Switch>*/}
              </Col>
            </Row>
          </Container>
        </Router>
      </ErrorBoundary>
    </DevToolsContext.Provider>
  );
};

export default Panel;
