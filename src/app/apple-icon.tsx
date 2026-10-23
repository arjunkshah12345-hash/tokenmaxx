import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#171717",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 96,
            height: 96,
            gap: 6,
          }}
        >
          {[1, 0.35, 1, 0.2, 0.45, 1, 0.25, 1, 1, 0.3, 1, 0.5, 0.2, 1, 0.4, 1].map(
            (op, i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  background: `rgba(40,210,110,${op})`,
                }}
              />
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
