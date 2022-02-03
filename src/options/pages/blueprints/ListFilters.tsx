import { Col, Form, Nav } from "react-bootstrap";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./ListFilters.module.scss";
import useReduxState from "@/hooks/useReduxState";
import { selectFilters } from "./blueprintsSelectors";
import blueprintsSlice from "./blueprintsSlice";

type ListFiltersProps = {
  teamFilters: string[];
  setGlobalFilter: (filterValue: string) => void;
};

function ListFilters({ teamFilters, setGlobalFilter }: ListFiltersProps) {
  const [filters, setFilters] = useReduxState(
    selectFilters,
    blueprintsSlice.actions.setFilters
  );
  const [query, setQuery] = useState("");
  const [temporaryFilters, setTemporaryFilters] = useState([]);

  // By default, react-table combines filters and globalFilters
  // If searching via keyword, temporarily
  // disable category filters
  useEffect(() => {
    setGlobalFilter(query);

    if (query) {
      if (filters.length > 0) {
        setTemporaryFilters(filters);
        setFilters([]);
      }

      return;
    }

    setFilters(temporaryFilters);
    setTemporaryFilters([]);
  }, [query]);

  // Prevent nav-link highlighting when search query
  // is present by setting an event key that doesn't exist
  const activeKey = useMemo(() => {
    if (query) {
      // Key doesn't exist
      return "Search results";
    }

    return filters[0]?.value ?? "All";
  }, [filters, query]);

  return (
    <Col xs={3} className={styles.filtersCol}>
      <Form className="mb-4 mr-3">
        <Form.Control
          id="query"
          placeholder="Search"
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
            Active Blueprints
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="All"
            onClick={() => {
              setFilters([]);
            }}
          >
            All Blueprints
          </Nav.Link>
        </Nav.Item>
        <h5 className="mt-3">My Collections</h5>
        <Nav.Item>
          <Nav.Link
            eventKey="Personal"
            onClick={() => {
              setFilters([{ id: "sharing.source.label", value: "Personal" }]);
            }}
          >
            Personal Blueprints
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="Public"
            onClick={() => {
              setFilters([{ id: "sharing.source.label", value: "Public" }]);
            }}
          >
            Public Marketplace Blueprints
          </Nav.Link>
        </Nav.Item>
        <h5 className="mt-3">Shared with Me</h5>
        {teamFilters.length === 0 && (
          <span className="text-muted">No shared blueprints</span>
        )}
        {teamFilters.map((filter) => (
          <Nav.Item key={filter}>
            <Nav.Link
              eventKey={filter}
              onClick={() => {
                setFilters([{ id: "sharing.source.label", value: filter }]);
              }}
            >
              {filter} Blueprints
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </Col>
  );
}

export default ListFilters;
