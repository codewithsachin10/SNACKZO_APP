// App entry point
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// In local development, stale service workers can break cross-origin fetch/WebSocket.
// We disable/unregister SWs in dev to avoid hard-to-debug network hangs.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		registrations.forEach((registration) => registration.unregister());
	});
}

createRoot(document.getElementById("root")!).render(<App />);
