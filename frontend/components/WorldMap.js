"use client";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap({ regions = [] }) {
  const max = Math.max(1, ...regions.map((r) => r.totalNodes || 0));

  return (
    <div style={{ width: "100%" }}>
      <ComposableMap
        projectionConfig={{ scale: 152 }}
        projection="geoEqualEarth"
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#161d34"
                stroke="#242c48"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#1f2848", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {regions.map((r) => {
          const size = 6 + 20 * ((r.totalNodes || 0) / max);
          const live = r.liveNodes > 0;
          return (
            <Marker key={r.region} coordinates={[r.lng, r.lat]}>
              <circle r={size + 6} fill={live ? "#34d399" : "#7c8cff"} fillOpacity={0.12} />
              <circle r={size} fill={live ? "#34d399" : "#7c8cff"} fillOpacity={0.22} />
              <circle r={Math.max(3, size / 3)} fill={live ? "#34d399" : "#9aa4c6"} />
              <text
                textAnchor="middle"
                y={-size - 8}
                style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 10, fontWeight: 600, fill: "#e9ecf7" }}
              >
                {r.label} · {r.totalNodes}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
      <p className="tiny faint" style={{ textAlign: "center", marginTop: 6 }}>
        Circle size = registered nodes · green = at least one node reported in the last 10 minutes
      </p>
    </div>
  );
}
