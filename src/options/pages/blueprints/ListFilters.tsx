import styles from "./ListFilters.module.scss";

import { Col, Form, Nav } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectFilters } from "./blueprintsSelectors";
import blueprintsSlice from "./blueprintsSlice";
import { useDebounce } from "use-debounce";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAsterisk,
  faCheck,
  faExternalLinkAlt,
  faGlobe,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { TableInstance } from "react-table";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import useFlags from "@/hooks/useFlags";

type ListFiltersProps = {
  teamFilters: string[];
  tableInstance: TableInstance<InstallableViewItem>;
};

function ListFilters({ teamFilters, tableInstance }: ListFiltersProps) {
  const { permit } = useFlags();
  const { setGlobalFilter } = tableInstance;
  const [filters, setFilters] = useReduxState(
    selectFilters,
    blueprintsSlice.actions.setFilters
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300, {
    trailing: true,
    leading: false,
  });

  // By default, search everything with the option to re-select
  // filtered category
  useEffect(() => {
    setGlobalFilter(debouncedQuery);

    if (debouncedQuery) {
      setFilters([]);
    }
  }, [debouncedQuery, setFilters, setGlobalFilter]);

  const activeKey = filters[0]?.value ?? "All";

  return (
    <Col md={3} sm={12} xl={2} className={styles.root}>
      <Form className="mb-4 mr-3">
        <Form.Control
          id="query"
          placeholder="Search all blueprints"
          size="sm"
          value={query}
          onChange={({ target }) => {
            setQuery(target.value);
          }}
        />
      </Form>
      <Nav
        className="flex-column"
        variant="pills"
        defaultActiveKey={activeKey}
        activeKey={activeKey}
      >
        <h5>Category Filters</h5>
        <Nav.Item>
          <Nav.Link
            eventKey="Active"
            onClick={() => {
              setFilters([{ id: "status", value: "Active" }]);
            }}
          >
            <FontAwesomeIcon icon={faCheck} /> Active
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="All"
            onClick={() => {
              setFilters([]);
            }}
          >
            <FontAwesomeIcon icon={faAsterisk} /> All Blueprints
          </Nav.Link>
        </Nav.Item>
        {permit("marketplace") && (
          <>
            <Nav.Item>
              <Nav.Link
                eventKey="Personal"
                onClick={() => {
                  setFilters([
                    { id: "sharing.source.label", value: "Personal" },
                  ]);
                }}
              >
                <FontAwesomeIcon icon={faUser} /> Personal
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="Public"
                onClick={() => {
                  setFilters([{ id: "sharing.source.label", value: "Public" }]);
                }}
              >
                <FontAwesomeIcon icon={faGlobe} /> Public Marketplace
              </Nav.Link>
            </Nav.Item>
          </>
        )}
        {teamFilters.length > 0 && <h5 className="mt-3">Shared with Me</h5>}
        {teamFilters.map((filter) => (
          <Nav.Item key={filter}>
            <Nav.Link
              eventKey={filter}
              onClick={() => {
                setFilters([{ id: "sharing.source.label", value: filter }]);
              }}
            >
              <FontAwesomeIcon icon={faUsers} /> {filter}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Nav className="flex-column">
        <h5>Explore</h5>
        <Nav.Item>
          <Nav.Link
            href="https://www.pixiebrix.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Public Marketplace
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </Col>
  );
}

export default ListFilters;
