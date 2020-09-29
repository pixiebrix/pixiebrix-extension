import React, { ErrorInfo } from "react";
import Rollbar from "rollbar";

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.toString() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // @ts-ignore: not sure what's going on with the rollbar type
    Rollbar.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <h1>Something went wrong.</h1>
          <div>
            <p>{this.state.errorMessage}</p>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
