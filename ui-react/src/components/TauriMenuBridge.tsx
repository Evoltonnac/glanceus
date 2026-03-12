import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTauri } from "../lib/utils";

const NAV_EVENT = "app:navigate";
const ALLOWED_ROUTES = new Set(["/", "/integrations", "/settings"]);

export function TauriMenuBridge() {
    const navigate = useNavigate();

    useEffect(() => {
        if (!isTauri()) {
            return;
        }

        let unlisten: (() => void) | undefined;

        listen<string>(NAV_EVENT, (event) => {
            const target = event.payload;
            if (typeof target === "string" && ALLOWED_ROUTES.has(target)) {
                navigate(target);
            }
        })
            .then((dispose) => {
                unlisten = dispose;
            })
            .catch((error) => {
                console.error("Failed to subscribe to Tauri menu navigation event", error);
            });

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, [navigate]);

    return null;
}
