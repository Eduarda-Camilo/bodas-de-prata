"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validPosition, type DevicePosition } from "@/lib/geolocation";
export type LocationStatus =
  "requesting" | "active" | "denied" | "unavailable" | "timeout" | "insecure";
export default function useDeviceLocation() {
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>("requesting");
  const watch = useRef<number | null>(null);
  const mounted = useRef(false);
  const start = useCallback(() => {
    if (!mounted.current || watch.current !== null) return;
    if (!window.isSecureContext) {
      setStatus("insecure");
      return;
    }
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    try {
      watch.current = navigator.geolocation.watchPosition(
        (value) => {
          if (!mounted.current) return;
          const location = validPosition(value);
          setPosition(location);
          setStatus(location ? "active" : "unavailable");
        },
        (error) => {
          if (!mounted.current) return;
          setPosition(null);
          setStatus(
            error.code === 1
              ? "denied"
              : error.code === 3
                ? "timeout"
                : "unavailable",
          );
          if (error.code === 1) {
            if (watch.current !== null)
              navigator.geolocation.clearWatch(watch.current);
            watch.current = null;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    } catch {
      watch.current = null;
      setStatus("unavailable");
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(start);
    return () => {
      mounted.current = false;
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    };
  }, [start]);
  const retry = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    start();
  }, [start]);
  return { position, status, start: retry };
}
