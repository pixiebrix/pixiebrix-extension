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
import React from "react";
import Locator from "@/devTools/Locator";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { IndexLinkContainer } from "react-router-bootstrap";
import Reader from "@/devTools/Reader";
import { HashRouter as Router } from "react-router-dom";
import { Route, Switch } from "react-router";
import ErrorBoundary from "@/designer/ErrorBoundary";

const Panel = ({}) => {
  return (
    <ErrorBoundary>
      <Router>
        <Container fluid>
          <Row>
            <Col lg="1">
              <Nav id="sidebar" className="flex-column">
                <IndexLinkContainer to="locator">
                  <Nav.Link href="#/locator">Locate</Nav.Link>
                </IndexLinkContainer>
                <IndexLinkContainer to="reader">
                  <Nav.Link href="#/reader">Read</Nav.Link>
                </IndexLinkContainer>
              </Nav>
            </Col>
            <Col>
              <Switch>
                <Route exact path="/locator">
                  <Locator />
                </Route>
                <Route exact path="/reader">
                  <Reader />
                </Route>
                <Route>
                  <Locator />
                </Route>
              </Switch>
            </Col>
          </Row>
        </Container>
      </Router>
    </ErrorBoundary>
  );
};

export default Panel;
