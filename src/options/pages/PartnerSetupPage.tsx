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
import { useTitle } from "@/hooks/title";
import { Card, Form, Row, Col, Button } from "react-bootstrap";
import aaLogo from "@img/aa-logo.svg";

const PartnerSetupPage: React.FunctionComponent = () => {
  useTitle("Connect your Automation Anywhere account");

  return (
    <Row className="w-100 mx-0">
      <Col className="mt-5 col-md-10 col-lg-7 col-sm-12 mx-auto">
        <Card>
          <Card.Header>Connect your Automation Anywhere account</Card.Header>
          <Card.Body>
            <img src={aaLogo} alt="Automation Anywhere Logo" />
            <h3>Connect your AARI account</h3>
            <Form>
              <Form.Group as={Row}>
                <Form.Label column sm={2}>
                  Control Room
                </Form.Label>
                <Col sm={10}>
                  <Form.Control type="text" />
                </Col>
              </Form.Group>
              <Form.Group as={Row}>
                <Form.Label column sm={2}>
                  Username
                </Form.Label>
                <Col sm={10}>
                  <Form.Control type="text" />
                </Col>
              </Form.Group>
              <Form.Group as={Row}>
                <Form.Label column sm={2}>
                  Password
                </Form.Label>
                <Col sm={10}>
                  <Form.Control type="password" />
                </Col>
              </Form.Group>
              <Button>Connect</Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default PartnerSetupPage;
