export function Skeleton({ width = "100%", height = 20, style }) {
  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: 8,
        ...style,
      }}
    />
  );
}