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

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ListGroup,
  Button,
  Col,
  Form,
  InputGroup,
  Row,
  Container,
  Badge,
} from "react-bootstrap";
import { sortBy, truncate } from "lodash";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDebounce } from "use-debounce";

import "./BlockModal.scss";
import { ServiceDefinition } from "@/types/definitions";
import { ButtonVariant } from "react-bootstrap/types";

const ServiceResult: React.FunctionComponent<{
  service: ServiceDefinition;
  onSelect: () => void;
}> = ({ service: { metadata }, onSelect }) => {
  return (
    <ListGroup.Item onClick={onSelect}>
      <div className="d-flex">
        <div className="mr-2">
          <FontAwesomeIcon icon={faCloud} />
        </div>
        <div className="flex-grow-1">
          <div className="d-flex BlockModal__title">
            <div className="flex-grow-1">{metadata.name}</div>
            <div className="flex-grow-0 BlockModal__badges">
              {metadata.id.startsWith("@pixiebrix/") && (
                <Badge variant="info">Official</Badge>
              )}
            </div>
          </div>
          <div className="BlockModal__id">
            <code className="small">{metadata.id}</code>
          </div>
          <div>
            <p className="mb-0 small">
              {truncate(metadata.description, { length: 256 })}
            </p>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const ServiceModal: React.FunctionComponent<{
  onSelect: (service: ServiceDefinition) => void;
  services: ServiceDefinition[];
  caption?: string;
  variant?: ButtonVariant;
}> = ({
  onSelect,
  services,
  caption = "Select a service",
  variant = "info",
}) => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const serviceOptions = useMemo(
    () =>
      (services ?? []).map((service) => ({
        value: service.metadata.id,
        label: service.metadata.name,
        service,
      })),
    [services]
  );

  const filteredOptions = useMemo(() => {
    if (debouncedQuery.trim() != "") {
      const normalQuery = debouncedQuery.toLowerCase();
      return sortBy(
        serviceOptions.filter(
          (x) =>
            x.label.toLowerCase().includes(normalQuery) ||
            (x.service.metadata.description ?? "")
              .toLowerCase()
              .includes(normalQuery)
        ),
        (x) => x.label
      );
    } else {
      return sortBy(serviceOptions, (x) => x.label);
    }
  }, [serviceOptions, debouncedQuery]);

  const close = useCallback(() => {
    setShow(false);
  }, [setShow]);

  return (
    <div>
      {show && (
        <Modal
          className="BlockModal"
          show={show}
          size="lg"
          onHide={close}
          backdrop={true}
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>{caption}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container>
              <Row>
                <Col>
                  <Form>
                    <InputGroup className="mb-2 mr-sm-2">
                      <InputGroup.Prepend>
                        <InputGroup.Text>Search</InputGroup.Text>
                      </InputGroup.Prepend>
                      <Form.Control
                        placeholder="Start typing to find results"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </InputGroup>
                  </Form>
                </Col>
              </Row>
              <Row>
                <Col>
                  <div className="BlockModal__results">
                    <ListGroup>
                      {filteredOptions.map((x) => (
                        <ServiceResult
                          key={x.service.metadata.id}
                          service={x.service}
                          onSelect={() => {
                            onSelect(x.service);
                            // reset the query for the next time it opens
                            setQuery("");
                            close();
                          }}
                        />
                      ))}
                    </ListGroup>
                  </div>
                </Col>
              </Row>
            </Container>
          </Modal.Body>
        </Modal>
      )}
      <Button variant={variant} onClick={() => setShow(true)}>
        {caption}
      </Button>
    </div>
  );
};

export default ServiceModal;
