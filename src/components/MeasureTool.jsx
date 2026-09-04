import React, { useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

/**
 * Interactive Precision 3D Ruler Tool.
 * Allows users to click two points on the model surface to measure Euclidean distance (in mm),
 * coordinate deltas (ΔX, ΔY, ΔZ), and provides direct feedback and alignment actions
 * for cut-plane (clipping plane) positioning.
 */
export function MeasureTool({
  mesh,
  meshes = [],
  active,
  pointA,
  pointB,
  onSetPointA,
  onSetPointB,
  onClearMeasurement,
  clippingConfig,
  onClippingConfigChange
}) {
  const { camera, raycaster, gl } = useThree();
  const [hoverPoint, setHoverPoint] = useState(null);
  const [hoverNormal, setHoverNormal] = useState(null);
  const [isHovering, setIsHovering] = useState(false);

  // Collect all target meshes to raycast against (including children of groups)
  const targetMeshes = useMemo(() => {
    const list = [];
    const collectMeshes = (obj) => {
      if (!obj) return;
      if (obj.isMesh && !list.includes(obj)) {
        list.push(obj);
      }
      if (obj.traverse) {
        obj.traverse((child) => {
          if (child.isMesh && !list.includes(child)) {
            list.push(child);
          }
        });
      }
    };

    collectMeshes(mesh);
    if (meshes && meshes.length > 0) {
      meshes.forEach(collectMeshes);
    }
    return list;
  }, [mesh, meshes]);

  // Handle direct canvas pointer interactions for exact model surface picking
  useEffect(() => {
    if (!active) return;
    const canvas = gl?.domElement;
    if (!canvas) return;

    let pointerDownPos = { x: 0, y: 0 };
    let isDown = false;

    const getPointerCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return new THREE.Vector2(x, y);
    };

    const getIntersections = (e) => {
      if (targetMeshes.length === 0) return [];
      const p = getPointerCoords(e);
      raycaster.setFromCamera(p, camera);
      return raycaster.intersectObjects(targetMeshes, true);
    };

    const handlePointerMove = (e) => {
      const hits = getIntersections(e);
      if (hits.length > 0) {
        const hit = hits[0];
        setHoverPoint(hit.point.clone());
        if (hit.face && hit.object) {
          const norm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          setHoverNormal(norm);
        } else {
          setHoverNormal(null);
        }
        setIsHovering(true);
      } else {
        setHoverPoint(null);
        setHoverNormal(null);
        setIsHovering(false);
      }
    };

    const handlePointerDown = (e) => {
      if (e.button !== 0) return; // Only track left-click
      pointerDownPos = { x: e.clientX, y: e.clientY };
      isDown = true;
    };

    const handlePointerUp = (e) => {
      if (!isDown || e.button !== 0) return;
      isDown = false;

      // Ignore if user was dragging the camera orbit
      const dragDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dragDist > 6) return;

      const hits = getIntersections(e);
      if (hits.length > 0) {
        const clickPoint = hits[0].point.clone();
        if (!pointA) {
          onSetPointA(clickPoint);
        } else if (!pointB) {
          onSetPointB(clickPoint);
        } else {
          // Restart fresh measurement starting with Point A
          onSetPointA(clickPoint);
          onSetPointB(null);
        }
      }
    };

    const handlePointerLeave = () => {
      setHoverPoint(null);
      setHoverNormal(null);
      setIsHovering(false);
      isDown = false;
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [active, targetMeshes, camera, raycaster, gl, pointA, pointB, onSetPointA, onSetPointB]);

  // Compute live distance for hover preview (if Point A is placed but Point B is not)
  const hoverDistance = useMemo(() => {
    if (!pointA || pointB || !hoverPoint) return null;
    return pointA.distanceTo(hoverPoint);
  }, [pointA, pointB, hoverPoint]);

  // Compute final distance once both points are placed
  const finalDistance = useMemo(() => {
    if (!pointA || !pointB) return null;
    return pointA.distanceTo(pointB);
  }, [pointA, pointB]);

  // Compute midpoint for distance label positioning
  const midpoint = useMemo(() => {
    if (pointA && pointB) {
      return new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
    }
    if (pointA && hoverPoint) {
      return new THREE.Vector3().addVectors(pointA, hoverPoint).multiplyScalar(0.5);
    }
    return null;
  }, [pointA, pointB, hoverPoint]);

  // Effective plane normal & offset from clippingConfig
  const { planeNormal, planeOffset, currentCutPlane } = useMemo(() => {
    if (!clippingConfig) {
      return {
        planeNormal: new THREE.Vector3(0, 1, 0),
        planeOffset: 0,
        currentCutPlane: null
      };
    }
    const norm = clippingConfig.normal
      ? clippingConfig.normal.clone().normalize()
      : new THREE.Vector3(0, 1, 0);
    const effNorm = clippingConfig.negate ? norm.clone().negate() : norm;
    const effOff = clippingConfig.negate
      ? -(clippingConfig.offset || 0)
      : (clippingConfig.offset || 0);
    const plane = new THREE.Plane(effNorm, -effOff);
    return {
      planeNormal: effNorm,
      planeOffset: effOff,
      currentCutPlane: plane
    };
  }, [clippingConfig?.normal, clippingConfig?.offset, clippingConfig?.negate]);

  // Distance of Point A and Point B from the cutting plane
  const distA = useMemo(() => {
    if (!pointA || !currentCutPlane) return null;
    return currentCutPlane.distanceToPoint(pointA);
  }, [pointA, currentCutPlane]);

  const distB = useMemo(() => {
    if (!pointB || !currentCutPlane) return null;
    return currentCutPlane.distanceToPoint(pointB);
  }, [pointB, currentCutPlane]);

  // Projected distance along plane normal (ΔKesit)
  const projectedDistance = useMemo(() => {
    if (!pointA || !pointB || !planeNormal) return null;
    return Math.abs(pointB.clone().sub(pointA).dot(planeNormal));
  }, [pointA, pointB, planeNormal]);

  // Intersection of cutting plane with ruler line segment [pointA, pointB]
  const planeIntersection = useMemo(() => {
    if (!pointA || !pointB || distA === null || distB === null) return null;
    if ((distA * distB) <= 0 && Math.abs(distA - distB) > 0.0001) {
      const t = distA / (distA - distB);
      if (t >= 0 && t <= 1) {
        const point = pointA.clone().lerp(pointB, t);
        const totalDist = pointA.distanceTo(pointB);
        return {
          point,
          t,
          distFromA: t * totalDist,
          distFromB: (1 - t) * totalDist
        };
      }
    }
    return null;
  }, [pointA, pointB, distA, distB]);

  // Perpendicular projections from Point A and Point B to the cutting plane
  const projA = useMemo(() => {
    if (!pointA || !currentCutPlane || distA === null || Math.abs(distA) < 0.2) return null;
    const p = new THREE.Vector3();
    currentCutPlane.projectPoint(pointA, p);
    return p;
  }, [pointA, currentCutPlane, distA]);

  const projB = useMemo(() => {
    if (!pointB || !currentCutPlane || distB === null || Math.abs(distB) < 0.2) return null;
    const p = new THREE.Vector3();
    currentCutPlane.projectPoint(pointB, p);
    return p;
  }, [pointB, currentCutPlane, distB]);

  // Cut-Plane Snap Actions
  const handleSnapToPoint = (pt) => {
    if (!pt || !onClippingConfigChange) return;
    const norm = clippingConfig?.normal
      ? clippingConfig.normal.clone().normalize()
      : new THREE.Vector3(0, 1, 0);
    const targetOffset = norm.dot(pt);
    onClippingConfigChange(
      {
        offset: Math.round(targetOffset * 10) / 10,
        enabled: true,
        showPlaneHelper: true
      },
      false
    );
  };

  const handleSnapToMidpoint = () => {
    if (!pointA || !pointB) return;
    const mid = pointA.clone().add(pointB).multiplyScalar(0.5);
    handleSnapToPoint(mid);
  };

  const handleAlignNormalToAB = () => {
    if (!pointA || !pointB || !onClippingConfigChange) return;
    const dir = pointB.clone().sub(pointA).normalize();
    if (dir.length() < 0.001) return;

    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
    const rotX = THREE.MathUtils.radToDeg(euler.x);
    const rotY = THREE.MathUtils.radToDeg(euler.y);
    const rotZ = THREE.MathUtils.radToDeg(euler.z);

    const mid = pointA.clone().add(pointB).multiplyScalar(0.5);
    const targetOffset = dir.dot(mid);

    onClippingConfigChange(
      {
        axis: 'custom',
        normal: dir,
        rotX: Math.round(rotX * 10) / 10,
        rotY: Math.round(rotY * 10) / 10,
        rotZ: Math.round(rotZ * 10) / 10,
        offset: Math.round(targetOffset * 10) / 10,
        enabled: true,
        showPlaneHelper: true
      },
      false
    );
  };

  // Build main measurement line coordinates
  const measurementLine = useMemo(() => {
    if (pointA && pointB) {
      return [
        [pointA.x, pointA.y, pointA.z],
        [pointB.x, pointB.y, pointB.z]
      ];
    }
    if (pointA && hoverPoint && !pointB) {
      return [
        [pointA.x, pointA.y, pointA.z],
        [hoverPoint.x, hoverPoint.y, hoverPoint.z]
      ];
    }
    return [];
  }, [pointA, pointB, hoverPoint]);

  // Caliper end caps at Point A and Point B
  const caliperEndCaps = useMemo(() => {
    if (!pointA || !pointB) return null;
    const dir = pointB.clone().sub(pointA).normalize();
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
    const capSize = 3.5;

    return {
      capA: [
        [pointA.x + perp.x * capSize, pointA.y + perp.y * capSize, pointA.z + perp.z * capSize],
        [pointA.x - perp.x * capSize, pointA.y - perp.y * capSize, pointA.z - perp.z * capSize]
      ],
      capB: [
        [pointB.x + perp.x * capSize, pointB.y + perp.y * capSize, pointB.z + perp.z * capSize],
        [pointB.x - perp.x * capSize, pointB.y - perp.y * capSize, pointB.z - perp.z * capSize]
      ]
    };
  }, [pointA, pointB]);

  // Vernier caliper millimeter tick marks
  const rulerTicks = useMemo(() => {
    if (!pointA || !pointB) return [];
    const totalDist = pointA.distanceTo(pointB);
    if (totalDist < 5) return [];

    const dir = pointB.clone().sub(pointA).normalize();
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) > 0.9) up = new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();

    const interval = totalDist > 120 ? 20 : totalDist > 50 ? 10 : 5;
    const list = [];
    for (let d = interval; d < totalDist - 1; d += interval) {
      const p = pointA.clone().addScaledVector(dir, d);
      const isMajor = d % (interval * 2) === 0;
      const tickLen = isMajor ? 2.5 : 1.5;
      list.push({
        points: [
          [p.x + perp.x * tickLen, p.y + perp.y * tickLen, p.z + perp.z * tickLen],
          [p.x - perp.x * tickLen, p.y - perp.y * tickLen, p.z - perp.z * tickLen]
        ],
        d
      });
    }
    return list;
  }, [pointA, pointB]);

  if (!active && !pointA && !pointB) return null;

  return (
    <group>
      {/* 1. Point A Marker */}
      {pointA && (
        <group position={[pointA.x, pointA.y, pointA.z]}>
          {/* Glowing Inner Core Sphere */}
          <mesh>
            <sphereGeometry args={[1.3, 24, 24]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#0891b2"
              emissiveIntensity={0.9}
              roughness={0.2}
            />
          </mesh>
          {/* Outer Pulsing Aura Ring */}
          <mesh>
            <ringGeometry args={[1.7, 2.6, 32]} />
            <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} />
          </mesh>
          {/* Node Label "A" with precise coordinates */}
          <Html center distanceFactor={22}>
            <div className="pointer-events-none -translate-x-1/2 -translate-y-9 bg-cyan-950/95 border border-cyan-400 text-cyan-200 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xl shadow-cyan-950/80 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Nokta A</span>
              <span className="font-mono text-[9px] text-cyan-300 font-normal">
                ({pointA.x.toFixed(1)}, {pointA.y.toFixed(1)}, {pointA.z.toFixed(1)})
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* 2. Point B Marker */}
      {pointB && (
        <group position={[pointB.x, pointB.y, pointB.z]}>
          {/* Glowing Inner Core Sphere */}
          <mesh>
            <sphereGeometry args={[1.3, 24, 24]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#d97706"
              emissiveIntensity={0.9}
              roughness={0.2}
            />
          </mesh>
          {/* Outer Ring */}
          <mesh>
            <ringGeometry args={[1.7, 2.6, 32]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
          </mesh>
          {/* Node Label "B" with precise coordinates */}
          <Html center distanceFactor={22}>
            <div className="pointer-events-none -translate-x-1/2 -translate-y-9 bg-amber-950/95 border border-amber-400 text-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xl shadow-amber-950/80 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Nokta B</span>
              <span className="font-mono text-[9px] text-amber-300 font-normal">
                ({pointB.x.toFixed(1)}, {pointB.y.toFixed(1)}, {pointB.z.toFixed(1)})
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* 3. Measurement Line & Caliper End Caps */}
      {measurementLine.length === 2 && (
        <group>
          <Line
            points={measurementLine}
            color={pointB ? '#10b981' : '#38bdf8'}
            lineWidth={4}
            dashed={!pointB}
            dashScale={2.5}
            dashSize={1.2}
            gapSize={0.8}
          />

          {/* Caliper End Caps */}
          {caliperEndCaps && (
            <>
              <Line points={caliperEndCaps.capA} color="#06b6d4" lineWidth={3.5} />
              <Line points={caliperEndCaps.capB} color="#f59e0b" lineWidth={3.5} />
            </>
          )}

          {/* Ruler Millimeter Ticks */}
          {rulerTicks.map((tick, idx) => (
            <Line
              key={`tick-${idx}`}
              points={tick.points}
              color="#34d399"
              lineWidth={2}
            />
          ))}
        </group>
      )}

      {/* 4. Cut Plane Projections & Distance from Plane */}
      {clippingConfig?.enabled && (
        <group>
          {/* Point A perpendicular projection to cut plane */}
          {projA && (
            <group>
              <Line
                points={[
                  [pointA.x, pointA.y, pointA.z],
                  [projA.x, projA.y, projA.z]
                ]}
                color="#06b6d4"
                lineWidth={2}
                dashed={true}
                dashSize={0.8}
                gapSize={0.6}
              />
              <mesh position={[projA.x, projA.y, projA.z]}>
                <sphereGeometry args={[0.7, 12, 12]} />
                <meshBasicMaterial color="#06b6d4" />
              </mesh>
            </group>
          )}

          {/* Point B perpendicular projection to cut plane */}
          {projB && (
            <group>
              <Line
                points={[
                  [pointB.x, pointB.y, pointB.z],
                  [projB.x, projB.y, projB.z]
                ]}
                color="#f59e0b"
                lineWidth={2}
                dashed={true}
                dashSize={0.8}
                gapSize={0.6}
              />
              <mesh position={[projB.x, projB.y, projB.z]}>
                <sphereGeometry args={[0.7, 12, 12]} />
                <meshBasicMaterial color="#f59e0b" />
              </mesh>
            </group>
          )}

          {/* Cut Plane Intersection with Ruler Line (when plane slices between A & B) */}
          {planeIntersection && (
            <group position={[planeIntersection.point.x, planeIntersection.point.y, planeIntersection.point.z]}>
              <mesh>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshStandardMaterial
                  color="#f43f5e"
                  emissive="#e11d48"
                  emissiveIntensity={1.0}
                />
              </mesh>
              <mesh>
                <ringGeometry args={[1.5, 2.5, 24]} />
                <meshBasicMaterial color="#fb7185" side={THREE.DoubleSide} />
              </mesh>
              <Html center distanceFactor={20}>
                <div className="pointer-events-none -translate-x-1/2 -translate-y-8 bg-rose-950/95 border border-rose-400 text-rose-100 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xl flex items-center gap-1 whitespace-nowrap">
                  <span>✂️ Kesit:</span>
                  <span className="font-mono text-cyan-300">A'dan {planeIntersection.distFromA.toFixed(1)}mm</span>
                  <span>|</span>
                  <span className="font-mono text-amber-300">B'den {planeIntersection.distFromB.toFixed(1)}mm</span>
                </div>
              </Html>
            </group>
          )}
        </group>
      )}

      {/* 5. Live 3D Distance Badge Floating at Midpoint with Cut-Plane Fast Actions */}
      {midpoint && (finalDistance !== null || hoverDistance !== null) && (
        <group position={[midpoint.x, midpoint.y, midpoint.z]}>
          <Html center distanceFactor={22}>
            <div className="pointer-events-auto -translate-x-1/2 -translate-y-1/2 bg-gray-950/95 border-2 border-emerald-400 text-white px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1 animate-in zoom-in-90 duration-150 whitespace-nowrap">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <span className="text-sm">📐</span>
                <span>
                  {pointB
                    ? `${finalDistance.toFixed(2)} mm`
                    : `~${hoverDistance?.toFixed(2)} mm`}
                </span>
              </div>

              {pointB && (
                <div className="text-[9px] text-gray-300 font-mono tracking-tight flex items-center gap-1.5">
                  <span className="text-red-400">ΔX:{Math.abs(pointB.x - pointA.x).toFixed(1)}</span>
                  <span>•</span>
                  <span className="text-green-400">ΔY:{Math.abs(pointB.y - pointA.y).toFixed(1)}</span>
                  <span>•</span>
                  <span className="text-blue-400">ΔZ:{Math.abs(pointB.z - pointA.z).toFixed(1)}</span>
                </div>
              )}

              {/* Cut-Plane Delta & Alignment Shortcut Buttons */}
              {pointB && clippingConfig && onClippingConfigChange && (
                <div className="pt-1.5 mt-0.5 border-t border-gray-800/80 flex flex-col items-center gap-1 w-full">
                  {projectedDistance !== null && (
                    <div className="text-[9px] text-sky-300 font-mono flex items-center gap-1">
                      <span>Kesit Ekseni (Δ{clippingConfig?.axis?.toUpperCase()}):</span>
                      <strong className="text-white">{projectedDistance.toFixed(2)} mm</strong>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] font-semibold">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnapToPoint(pointA);
                      }}
                      className="px-1.5 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 rounded transition shadow-sm"
                      title="Kesit düzlemini tam Nokta A hizasına taşır"
                    >
                      Düzlem → A
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnapToMidpoint();
                      }}
                      className="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 rounded transition shadow-sm font-bold"
                      title="Kesit düzlemini Nokta A ve B'nin tam orta noktasına taşır"
                    >
                      Ortadan Kes
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnapToPoint(pointB);
                      }}
                      className="px-1.5 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/50 rounded transition shadow-sm"
                      title="Kesit düzlemini tam Nokta B hizasına taşır"
                    >
                      Düzlem → B
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* 6. Live Cursor Hover Caliper Ring on Surface */}
      {active && hoverPoint && isHovering && (
        <group position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
          <mesh>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshBasicMaterial color={!pointA ? '#06b6d4' : '#f59e0b'} />
          </mesh>

          {/* Normal-aligned target ring */}
          {hoverNormal && (
            <group
              quaternion={new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                hoverNormal
              )}
            >
              <mesh>
                <ringGeometry args={[1.5, 2.3, 24]} />
                <meshBasicMaterial
                  color={!pointA ? '#22d3ee' : '#fbbf24'}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          )}

          <Html center distanceFactor={18}>
            <div className="pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-12">
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-lg whitespace-nowrap flex items-center gap-1 ${
                  !pointA
                    ? 'bg-cyan-950/95 text-cyan-300 border-cyan-500/80 shadow-cyan-950/60'
                    : 'bg-amber-950/95 text-amber-300 border-amber-500/80 shadow-amber-950/60'
                }`}
              >
                <span>{!pointA ? '1. Noktayı Seçin (Nokta A)' : '2. Noktayı Seçin (Nokta B)'}</span>
              </div>
              <div className="text-[9px] font-mono text-gray-300 bg-gray-950/80 px-1 py-0.2 rounded border border-gray-800 mt-0.5">
                [{hoverPoint.x.toFixed(1)}, {hoverPoint.y.toFixed(1)}, {hoverPoint.z.toFixed(1)}] mm
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
