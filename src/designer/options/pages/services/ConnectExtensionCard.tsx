import React, { useState } from "react";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import useAsyncEffect from "use-async-effect";
import { getExtensionToken } from "@/auth/token";
import Card from "react-bootstrap/Card";
import urljoin from "url-join";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

const ConnectExtensionCard: React.FunctionComponent = ({}) => {
  const [hasExtensionKey, setHasExtensionKey] = useState(true);
  const [serviceURL] = useAsyncState(getBaseURL);

  useAsyncEffect(
    async (isMounted) => {
      const hasKey = !!(await getExtensionToken());
      if (isMounted()) return;
      setHasExtensionKey(hasKey);
    },
    [setHasExtensionKey]
  );

  if (hasExtensionKey) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header>Connect to PixieBrix</Card.Header>
      <Card.Body>
        <p>
          By linking your browser extension with PixieBrix, you'll get access to
          team features and public services.
        </p>
        {serviceURL && (
          <a
            href={urljoin(serviceURL, "extension")}
            className="btn btn-primary"
            target="_blank"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} /> Open PixieBrix Website
          </a>
        )}
      </Card.Body>
    </Card>
  );
};

export default ConnectExtensionCard;
