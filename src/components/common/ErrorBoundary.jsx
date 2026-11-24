import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 my-5 text-center">
          <div className="card shadow-sm border-danger border-opacity-25 mx-auto" style={{ maxWidth: "600px" }}>
            <div className="card-body p-4">
              <div className="text-danger mb-3">
                <i className="bi bi-exclamation-triangle-fill fs-1"></i>
              </div>
              <h5 className="card-title fw-bold text-danger mb-2">View Rendering Error</h5>
              <p className="text-muted small mb-3">
                An unexpected error occurred while rendering this page view. Your stored student records, documents, and settings are safe and preserved.
              </p>
              {this.state.error && (
                <div
                  className="alert alert-light text-start border small text-danger font-monospace p-2 mb-3"
                  style={{ maxHeight: "120px", overflowY: "auto" }}
                >
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.hash = "#/dashboard";
                  }}
                >
                  <i className="bi bi-speedometer2 me-1"></i>Return to Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={this.handleReload}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Reload Application
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
