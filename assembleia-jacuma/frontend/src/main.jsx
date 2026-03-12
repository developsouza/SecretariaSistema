import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Desativa restauração de scroll nativa
if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

// Scroll lock: impede qualquer reposicionamento durante o carregamento inicial
window.scrollTo(0, 0);
let _scrollLocked = true;
const _lockHandler = () => {
    if (_scrollLocked) window.scrollTo(0, 0);
};
window.addEventListener("scroll", _lockHandler, { passive: false });
// Libera após 800ms (tempo suficiente para imagens e API carregarem)
setTimeout(() => {
    _scrollLocked = false;
    window.removeEventListener("scroll", _lockHandler);
}, 800);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
