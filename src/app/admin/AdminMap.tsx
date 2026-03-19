"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type HeatPoint = { lat: number; lon: number };

export default function AdminMap({ points }: { points: HeatPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      // Fix icônes leaflet cassées dans Next.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!).setView([43.7, 7.25], 12);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Heatmap effect : cercles superposés avec opacité
      points.forEach(({ lat, lon }) => {
        L.circleMarker([lat, lon], {
          radius: 14,
          fillColor: "#1B5E9B",
          color: "transparent",
          fillOpacity: 0.25,
          weight: 0,
        }).addTo(map);
        L.circleMarker([lat, lon], {
          radius: 6,
          fillColor: "#f97316",
          color: "transparent",
          fillOpacity: 0.6,
          weight: 0,
        }).addTo(map);
      });

      // Adapter le zoom si on a des points
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} className="w-full rounded-xl" style={{ height: 420 }} />
    </>
  );
}
