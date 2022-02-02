import { Col, Nav } from "react-bootstrap";
import React from "react";
import styles from "./ListFilters.module.scss";
import useReduxState from "@/hooks/useReduxState";
import { selectFilters } from "./blueprintsSelectors";
import blueprintsSlice from "./blueprintsSlice";

type ListFiltersProps = {
  teamFilters: string[];
};

function ListFilters({ teamFilters }: ListFiltersProps) {
  const [filters, setFilters] = useReduxState(
    selectFilters,
    blueprintsSlice.actions.setFilters
  );

  const defaultActiveKey = filters[0]?.value ?? "All";

  return (
    <Col xs={3} className={styles.filtersCol}>
      <h5>Category Filters</h5>
      <Nav
        className="flex-column"
        variant="pills"
        defaultActiveKey={defaultActiveKey}
      >
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
