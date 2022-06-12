import { getErrorMessage } from "@/errors/errorHelpers";
import React from "react";
import { Card } from "react-bootstrap";
import GridLoader from "react-spinners/GridLoader";

type OwnProps = {
  header: React.ReactNode;
  error: unknown;
  isPending: boolean;
  renderActions?: (options: { isLoaded: boolean }) => React.ReactNode;
  children: () => React.ReactNode;
};

/**
 * Card Component for displaying async data, e.g., from and endpoint
 */
const AsyncCard: React.FC<OwnProps> = ({
  header,
  renderActions,
  error,
  isPending,
  children,
}) => {
  let body: React.ReactNode;

  if (isPending) {
    body = (
      <div className="p-4">
        <GridLoader />
      </div>
    );
  } else if (error) {
    body = (
      <div className="text-danger p-4">
        An error occurred: {getErrorMessage(error)}
      </div>
    );
  } else {
    body = children();
  }

  return (
    <Card>
      <Card.Header className="d-flex align-items-center">
        <div className="flex-grow-1">{header}</div>
        {renderActions && (
          <div>{renderActions({ isLoaded: !isPending && !error })}</div>
        )}
      </Card.Header>
      <Card.Body className="p-0">{body}</Card.Body>
    </Card>
  );
};

export default AsyncCard;
