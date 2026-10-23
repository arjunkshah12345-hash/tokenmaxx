import { ImageResponse } from "next/og";

export const alt = "TOKENMAXX — burn the most tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFAF9",
          padding: 72,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#171717",
              display: "flex",
              flexWrap: "wrap",
              padding: 6,
              gap: 3,
            }}
          >
            {[1, 0.4, 1, 0.25, 0.5, 1, 0.3, 1].map((op, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  background: `rgba(40,210,110,${op})`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 48,
              letterSpacing: -1,
              color: "#171717",
            }}
          >
            TOKENMAXX
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 72,
              letterSpacing: -2,
              color: "#171717",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            The leaderboard for using the most tokens.
          </div>
          <div style={{ fontSize: 28, color: "#737373", fontFamily: "sans-serif" }}>
            Connect every AI coding sub. Climb hourly · daily · weekly · monthly.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#171717",
            fontFamily: "monospace",
            letterSpacing: 2,
          }}
        >
          OPEN SOURCE · T3 LINKUP · DITHER-KIT
        </div>
      </div>
    ),
    size,
  );
}
