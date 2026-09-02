"use client";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap({ regions = [] }) {
  const max = Math.max(1, ...regions.map((r) => r.totalNodes || 0));

  return (
    <div style={{ width: "100%" }}>
      <ComposableMap
        projectionConfig={{ scale: 147 }}
        projection="geoEqualEarth"
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1c2440"
                stroke="#263050"
                strokeWidth={0.4}
                style={{ default: { outline: "none" }, hover: { fill: "#25305a", outline: "none" }, pressed: { outline: "none" } }}
              />
            ))
          }
        </Geographies>

        {regions.map((r) => {
          const size = 5 + 22 * ((r.totalNodes || 0) / max);
          return (
            <Marker key={r.region} coordinates={[r.lng, r.lat]}>
              <circle r={size} fill="#6366f1" fillOpacity={0.25} />
              <circle r={Math.max(3, size / 3)} fill={r.liveNodes ? "#4ade80" : "#8892b0"} />
              <text
                textAnchor="middle"
                y={-size - 4}
                style={{ fontFamily: "sans-serif", fontSize: 10, fill: "#e6e9f0" }}
              >
                {r.label} · {r.totalNodes}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
        Circle size = registered nodes · green = at least one node reported in the last 10 min
      </p>
    </div>
  );
}
