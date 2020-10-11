import Card from "react-bootstrap/Card";
import React, { useMemo } from "react";
import { useAsyncState } from "@/hooks/common";
import { getErrors } from "@/background/errors";
import { GridLoader } from "react-spinners";
import { Table } from "react-bootstrap";
import { IExtensionPoint } from "@/core";
import moment from "moment";

interface OwnProps {
  extensionPoint: IExtensionPoint;
  extensionId: string;
}

const ErrorLogCard: React.FunctionComponent<OwnProps> = ({
  extensionPoint,
  extensionId,
}) => {
  const stateFactory = useMemo(
    () => getErrors({ extensionPointId: extensionPoint.id, extensionId }),
    [extensionPoint.id, extensionId]
  );
  const [errors, isLoading] = useAsyncState(stateFactory);

  return isLoading ? (
    <Card.Body>
      <GridLoader />
    </Card.Body>
  ) : (
    <Table>
      <thead>
        <tr>
          <td>Timestamp</td>
          <td>Error</td>
        </tr>
      </thead>
      <tbody>
        {errors.map((x) => (
          <tr key={x.context.uuid}>
            <td>
              {moment(Number.parseInt(x.context.timestamp, 10)).fromNow()}
            </td>
            <td>{x.error.message}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ErrorLogCard;
