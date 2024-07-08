import React from "react";

const DetailSection: React.FunctionComponent<{ title: string }> = ({
  title,
  children,
}) => (
  <div className="my-4">
    <div className="font-weight-bold">{title}</div>
    <div className="py-2">{children}</div>
  </div>
);

export default DetailSection;
