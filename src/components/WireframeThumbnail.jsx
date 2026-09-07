import React, { useMemo, useState } from 'react';

/**
 * WireframeThumbnail
 *
 * Renders an isometric 3D wireframe preview of a model configuration.
 * Accurately reflects model scale (X, Y, Z), proportional aspect ratio,
 * internal slicing layers, and material color styling.
 *
 * @param {Object} props
 * @param {{x: number, y: number, z: number}} [props.scale] - Model scale factors (e.g. {x: 1, y: 1, z: 1})
 * @param {{x: number, y: number, z: number}} [props.dimensions] - Base dimensions in mm
 * @param {string} [props.materialColor] - Hex or CSS color (e.g. '#06b6d4', '#f59e0b')
 * @param {string} [props.materialName] - Material name (e.g. 'PLA', 'ABS', 'PETG')
 * @param {number} [props.size=64] - Thumbnail box pixel dimension
 * @param {boolean} [props.showScaleBadge=true] - Show bottom scale percentage pill
 * @param {boolean} [props.showAxes=false] - Show mini coordinate triad
 * @param {boolean} [props.interactive=false] - Allow hover tilt/interactive rotation
 * @param {string} [props.className=''] - Extra classes
 */
export default function WireframeThumbnail({
  scale = { x: 1, y: 1, z: 1 },
  dimensions = { x: 50, y: 50, z: 50 },
  materialColor = '#06b6d4',
  materialName = 'PLA',
  size = 64,
  showScaleBadge = true,
  showAxes = false,
  interactive = true,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Normalize scale and dimension values
  const sx = Math.max(0.01, Number(scale?.x ?? 1));
  const sy = Math.max(0.01, Number(scale?.y ?? 1));
  const sz = Math.max(0.01, Number(scale?.z ?? 1));

  const dimX = Math.max(1, (Number(dimensions?.x) || 50) * sx);
  const dimY = Math.max(1, (Number(dimensions?.y) || 50) * sy);
  const dimZ = Math.max(1, (Number(dimensions?.z) || 50) * sz);

  const isUniform = Math.abs(sx - sy) < 0.005 && Math.abs(sy - sz) < 0.005;
  const uniformPercent = Math.round(sx * 100);

  // Projection calculations
  const geometry = useMemo(() => {
    // Determine isometric angle (with slight hover tilt if interactive)
    const baseAngle = Math.PI / 6; // 30 degrees
    const tiltOffset = isHovered && interactive ? 0.08 : 0;
    const angle = baseAngle + tiltOffset;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Normalize dimensions so the largest dimension spans proportional 3D space
    const maxDim = Math.max(dimX, dimY, dimZ);
    const nx = (dimX / maxDim);
    const ny = (dimY / maxDim);
    const nz = (dimZ / maxDim);

    // Bounding radius for SVG canvas
    const drawRadius = (size * 0.42);
    const hx = nx * drawRadius;
    const hy = ny * drawRadius;
    const hz = nz * drawRadius;

    // Isometric 3D to 2D projection function
    // 3D: X is right-down, Y is left-down, Z is up
    const project = (x3, y3, z3) => {
      const px = (x3 - y3) * cosA;
      const py = (x3 + y3) * sinA - z3;
      return { x: px, y: py };
    };

    // 8 Bounding Box Vertices
    // C0: Back bottom (-hx, -hy, -hz)
    // C1: Right bottom (+hx, -hy, -hz)
    // C2: Front bottom (+hx, +hy, -hz)
    // C3: Left bottom (-hx, +hy, -hz)
    // C4: Back top (-hx, -hy, +hz)
    // C5: Right top (+hx, -hy, +hz)
    // C6: Front top (+hx, +hy, +hz)
    // C7: Left top (-hx, +hy, +hz)
    const v3 = [
      [-hx, -hy, -hz], // 0
      [+hx, -hy, -hz], // 1
      [+hx, +hy, -hz], // 2
      [-hx, +hy, -hz], // 3
      [-hx, -hy, +hz], // 4
      [+hx, -hy, +hz], // 5
      [+hx, +hy, +hz], // 6
      [-hx, +hy, +hz]  // 7
    ];

    const projected = v3.map(([x, y, z]) => project(x, y, z));

    // Calculate vertical centering offset
    const minY = Math.min(...projected.map((p) => p.y));
    const maxY = Math.max(...projected.map((p) => p.y));
    const minX = Math.min(...projected.map((p) => p.x));
    const maxX = Math.max(...projected.map((p) => p.x));

    // Center point in SVG space
    const cx = size / 2 - (minX + maxX) / 2;
    const cy = size / 2 - (minY + maxY) / 2;

    const toSvg = (p) => ({
      x: parseFloat((cx + p.x).toFixed(1)),
      y: parseFloat((cy + p.y).toFixed(1))
    });

    const pts = projected.map(toSvg);

    // Intermediate horizontal slicing layers (2 internal layer slices)
    const layers = [-0.33, 0.33].map((factor) => {
      const zVal = hz * factor;
      return [
        toSvg(project(-hx, -hy, zVal)),
        toSvg(project(+hx, -hy, zVal)),
        toSvg(project(+hx, +hy, zVal)),
        toSvg(project(-hx, +hy, zVal))
      ];
    });

    // Mid-rib vertical slicing lines for visible front faces
    const midFrontRightBottom = toSvg(project(+hx, 0, -hz));
    const midFrontRightTop = toSvg(project(+hx, 0, +hz));

    const midFrontLeftBottom = toSvg(project(0, +hy, -hz));
    const midFrontLeftTop = toSvg(project(0, +hy, +hz));

    const midTopRight = toSvg(project(+hx, 0, +hz));
    const midTopLeft = toSvg(project(-hx, 0, +hz));
    const midTopFront = toSvg(project(0, +hy, +hz));
    const midTopBack = toSvg(project(0, -hy, +hz));

    return {
      pts,
      layers,
      midFrontRightBottom,
      midFrontRightTop,
      midFrontLeftBottom,
      midFrontLeftTop,
      midTopRight,
      midTopLeft,
      midTopFront,
      midTopBack
    };
  }, [dimX, dimY, dimZ, size, isHovered, interactive]);

  const p = geometry.pts;
  const primaryColor = materialColor || '#06b6d4';

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none group ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${materialName} (${Math.round(dimX)}×${Math.round(dimY)}×${Math.round(dimZ)} mm) - Ölçek: ${
        isUniform ? `${uniformPercent}%` : `X:${Math.round(sx * 100)}% Y:${Math.round(sy * 100)}% Z:${Math.round(sz * 100)}%`
      }`}
    >
      {/* Background Canvas Box */}
      <div
        className={`w-full h-full rounded-lg border transition-all duration-300 overflow-hidden flex items-center justify-center ${
          isHovered
            ? 'bg-gray-900 border-indigo-500/60 shadow-md shadow-indigo-950/40'
            : 'bg-gray-950/90 border-gray-800/90'
        }`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible pointer-events-none"
        >
          <defs>
            {/* Subtle glow filter */}
            <filter id={`wire-glow-${size}-${primaryColor.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={primaryColor} floodOpacity="0.45" />
            </filter>

            {/* Facet gradients */}
            <linearGradient id={`facet-top-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id={`facet-right-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.14" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={`facet-left-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.1" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 1. Translucent Shaded Facets (gives solid visual weight to wireframe) */}
          {/* Top Face: 4 -> 5 -> 6 -> 7 */}
          <polygon
            points={`${p[4].x},${p[4].y} ${p[5].x},${p[5].y} ${p[6].x},${p[6].y} ${p[7].x},${p[7].y}`}
            fill={`url(#facet-top-${size})`}
          />
          {/* Front-Right Face: 1 -> 5 -> 6 -> 2 */}
          <polygon
            points={`${p[1].x},${p[1].y} ${p[5].x},${p[5].y} ${p[6].x},${p[6].y} ${p[2].x},${p[2].y}`}
            fill={`url(#facet-right-${size})`}
          />
          {/* Front-Left Face: 2 -> 6 -> 7 -> 3 */}
          <polygon
            points={`${p[2].x},${p[2].y} ${p[6].x},${p[6].y} ${p[7].x},${p[7].y} ${p[3].x},${p[3].y}`}
            fill={`url(#facet-left-${size})`}
          />

          {/* 2. Hidden Back Wireframe Edges (dashed, low opacity for CAD look) */}
          {/* 0 -> 1, 0 -> 3, 0 -> 4 */}
          <line
            x1={p[0].x}
            y1={p[0].y}
            x2={p[1].x}
            y2={p[1].y}
            stroke={primaryColor}
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
          />
          <line
            x1={p[0].x}
            y1={p[0].y}
            x2={p[3].x}
            y2={p[3].y}
            stroke={primaryColor}
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
          />
          <line
            x1={p[0].x}
            y1={p[0].y}
            x2={p[4].x}
            y2={p[4].y}
            stroke={primaryColor}
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeOpacity="0.3"
          />

          {/* 3. Internal Horizontal Layer Slices (Slicer layer rings) */}
          {geometry.layers.map((layerPts, idx) => (
            <g key={idx}>
              {/* Back edges dashed */}
              <line
                x1={layerPts[0].x}
                y1={layerPts[0].y}
                x2={layerPts[1].x}
                y2={layerPts[1].y}
                stroke={primaryColor}
                strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
                strokeOpacity="0.25"
              />
              <line
                x1={layerPts[0].x}
                y1={layerPts[0].y}
                x2={layerPts[3].x}
                y2={layerPts[3].y}
                stroke={primaryColor}
                strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
                strokeOpacity="0.25"
              />
              {/* Front edges solid */}
              <line
                x1={layerPts[1].x}
                y1={layerPts[1].y}
                x2={layerPts[2].x}
                y2={layerPts[2].y}
                stroke={primaryColor}
                strokeWidth="0.75"
                strokeOpacity="0.5"
              />
              <line
                x1={layerPts[2].x}
                y1={layerPts[2].y}
                x2={layerPts[3].x}
                y2={layerPts[3].y}
                stroke={primaryColor}
                strokeWidth="0.75"
                strokeOpacity="0.5"
              />
            </g>
          ))}

          {/* 4. Triangular Mesh & Rib Cross-Lines (distinctive STL faceted appearance) */}
          {/* Top Face Triangulation */}
          <line
            x1={p[4].x}
            y1={p[4].y}
            x2={p[6].x}
            y2={p[6].y}
            stroke={primaryColor}
            strokeWidth="0.7"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
          />
          {/* Front-Right Diagonal Triangulation */}
          <line
            x1={p[1].x}
            y1={p[1].y}
            x2={p[6].x}
            y2={p[6].y}
            stroke={primaryColor}
            strokeWidth="0.75"
            strokeOpacity="0.45"
          />
          {/* Front-Left Diagonal Triangulation */}
          <line
            x1={p[3].x}
            y1={p[3].y}
            x2={p[6].x}
            y2={p[6].y}
            stroke={primaryColor}
            strokeWidth="0.75"
            strokeOpacity="0.45"
          />

          {/* 5. Visible Outer Wireframe Edges (Bold & Glowing) */}
          {/* Bottom perimeter: 1-2, 2-3 */}
          <line
            x1={p[1].x}
            y1={p[1].y}
            x2={p[2].x}
            y2={p[2].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />
          <line
            x1={p[2].x}
            y1={p[2].y}
            x2={p[3].x}
            y2={p[3].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />

          {/* Vertical columns: 1-5, 2-6, 3-7 */}
          <line
            x1={p[1].x}
            y1={p[1].y}
            x2={p[5].x}
            y2={p[5].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />
          <line
            x1={p[2].x}
            y1={p[2].y}
            x2={p[6].x}
            y2={p[6].y}
            stroke={primaryColor}
            strokeWidth="1.4"
            strokeOpacity="1"
            strokeLinecap="round"
          />
          <line
            x1={p[3].x}
            y1={p[3].y}
            x2={p[7].x}
            y2={p[7].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />

          {/* Top perimeter: 4-5, 5-6, 6-7, 7-4 */}
          <line
            x1={p[4].x}
            y1={p[4].y}
            x2={p[5].x}
            y2={p[5].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />
          <line
            x1={p[5].x}
            y1={p[5].y}
            x2={p[6].x}
            y2={p[6].y}
            stroke={primaryColor}
            strokeWidth="1.3"
            strokeOpacity="1"
            strokeLinecap="round"
          />
          <line
            x1={p[6].x}
            y1={p[6].y}
            x2={p[7].x}
            y2={p[7].y}
            stroke={primaryColor}
            strokeWidth="1.3"
            strokeOpacity="1"
            strokeLinecap="round"
          />
          <line
            x1={p[7].x}
            y1={p[7].y}
            x2={p[4].x}
            y2={p[4].y}
            stroke={primaryColor}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinecap="round"
          />

          {/* 6. Corner Vertex Nodes (Luminous 3D points) */}
          <circle cx={p[6].x} cy={p[6].y} r="1.8" fill="#ffffff" stroke={primaryColor} strokeWidth="1" />
          <circle cx={p[2].x} cy={p[2].y} r="1.3" fill={primaryColor} />
          <circle cx={p[5].x} cy={p[5].y} r="1.3" fill={primaryColor} />
          <circle cx={p[7].x} cy={p[7].y} r="1.3" fill={primaryColor} />
        </svg>
      </div>

      {/* Top-Right Material Color Indicator Pip */}
      <span
        className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black/40 shadow-sm"
        style={{ backgroundColor: primaryColor }}
        title={`Malzeme: ${materialName}`}
      />

      {/* Bottom Scale Percentage Badge */}
      {showScaleBadge && (
        <div className="absolute bottom-0.5 inset-x-1 flex justify-center pointer-events-none">
          <span
            className={`px-1 py-0.2 rounded font-mono text-[8px] font-black tracking-tight leading-none shadow-sm backdrop-blur-sm border ${
              isUniform
                ? 'bg-gray-950/80 text-cyan-300 border-cyan-500/40'
                : 'bg-indigo-950/90 text-indigo-300 border-indigo-500/50'
            }`}
          >
            {isUniform ? `${uniformPercent}%` : `${Math.round(sx * 100)}/${Math.round(sy * 100)}/${Math.round(sz * 100)}`}
          </span>
        </div>
      )}
    </div>
  );
}
