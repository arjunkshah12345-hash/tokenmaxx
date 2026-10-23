import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#171717",
          display: "flex",
          flexWrap: "wrap",
          padding: 3,
          gap: 2,
        }}
      >
        {[1, 0.35, 1, 0.2, 0.45, 1, 0.25, 1, 1, 0.3, 1, 0.5, 0.2, 1, 0.4, 1].map(
          (op, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                background: `rgba(40,210,110,${op})`,
              }}
            />
          ),
        )}
      </div>
    ),
    size,
  );
}
