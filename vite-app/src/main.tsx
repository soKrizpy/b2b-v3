import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Reuse the established Bits2Bytes design system during the migration.
// Legacy files remain untouched and serve as the visual source of truth.
import "../../css/design-tokens.css";
import "../../css/base.css";
import "../../css/components.css";
import "../../css/views.css";
import "../../css/lesson.css";
import "../../css/teacher.css";
import "../../css/parent-hub.css";
import "../../css/prototype-integration.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
