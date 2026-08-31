package com.example.stlpincut.graphics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.PointerInputChange
import androidx.compose.ui.input.pointer.pointerInput
import com.example.stlpincut.model.CutResult
import com.example.stlpincut.model.CutSpline
import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.Triangle
import com.example.stlpincut.model.Vector3D
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

private data class ProjectedTriangle(
    val s1: Vector3D,
    val s2: Vector3D,
    val s3: Vector3D,
    val depth: Float,
    val isFrontFacing: Boolean,
    val color: Color,
    val wireColor: Color,
    val originalIndex: Int
)

@Composable
fun Viewport3D(
    mesh: Mesh3D?,
    paintedFaces: Set<Int>,
    cutSpline: CutSpline?,
    cutResult: CutResult?,
    isPainting: Boolean,
    brushSizeMm: Float,
    isWireframe: Boolean,
    explodedDistance: Float,
    camera: Camera3D,
    onCameraChange: (Camera3D) -> Unit,
    onPaintTouch: (screenX: Float, screenY: Float, width: Float, height: Float) -> Unit,
    modifier: Modifier = Modifier
) {
    var brushCursorPos by remember { mutableStateOf<Offset?>(null) }

    Box(modifier = modifier.fillMaxSize()) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(isPainting, camera) {
                    if (isPainting) {
                        detectDragGestures(
                            onDragStart = { offset ->
                                brushCursorPos = offset
                                onPaintTouch(offset.x, offset.y, size.width.toFloat(), size.height.toFloat())
                            },
                            onDrag = { change: PointerInputChange, _ ->
                                change.consume()
                                brushCursorPos = change.position
                                onPaintTouch(
                                    change.position.x,
                                    change.position.y,
                                    size.width.toFloat(),
                                    size.height.toFloat()
                                )
                            },
                            onDragEnd = {
                                brushCursorPos = null
                            },
                            onDragCancel = {
                                brushCursorPos = null
                            }
                        )
                    } else {
                        detectTransformGestures { _, pan, zoom, _ ->
                            val newDist = (camera.distance / zoom).coerceIn(40f, 400f)
                            val newYaw = (camera.yawDeg + pan.x * 0.4f) % 360f
                            val newPitch = (camera.pitchDeg - pan.y * 0.4f).coerceIn(-89f, 89f)

                            onCameraChange(
                                camera.copy(
                                    yawDeg = newYaw,
                                    pitchDeg = newPitch,
                                    distance = newDist
                                )
                            )
                        }
                    }
                }
        ) {
            val width = size.width
            val height = size.height

            // 1. Draw 3D Ground Grid Plate
            drawGroundGrid(camera, width, height)

            // 2. Render Mesh
            if (cutResult != null && explodedDistance > 0f) {
                // Render Split Parts A and B with explosion separation
                renderSplitMeshes(
                    cutResult = cutResult,
                    explodedDistance = explodedDistance,
                    camera = camera,
                    width = width,
                    height = height,
                    isWireframe = isWireframe
                )
            } else if (mesh != null && mesh.triangles.isNotEmpty()) {
                // Render Single Unified Mesh with painted face highlights
                renderSingleMesh(
                    mesh = mesh,
                    paintedFaces = paintedFaces,
                    camera = camera,
                    width = width,
                    height = height,
                    isWireframe = isWireframe
                )
            }

            // 3. Render Spline Cut Ring
            if (cutSpline != null && cutSpline.sampledPoints.size > 2) {
                drawCutSpline(cutSpline, camera, width, height)
            }

            // 4. Draw Brush Cursor when painting
            brushCursorPos?.let { pos ->
                val cursorRadiusPx = brushSizeMm * (width / 200f).coerceIn(1.5f, 4f)
                drawCircle(
                    color = Color(0xFFF59E0B),
                    radius = cursorRadiusPx,
                    center = pos,
                    style = Stroke(width = 2.5f)
                )
                drawCircle(
                    color = Color(0x33F59E0B),
                    radius = cursorRadiusPx,
                    center = pos
                )
            }
        }
    }
}

private fun DrawScope.drawGroundGrid(camera: Camera3D, width: Float, height: Float) {
    val gridExtent = 60f
    val gridStep = 15f
    val yLevel = -35f

    val gridColor = Color(0x2210B981)
    val axisXColor = Color(0x44EF4444)
    val axisZColor = Color(0x443B82F6)

    var x = -gridExtent
    while (x <= gridExtent) {
        val p1 = camera.worldToView(Vector3D(x, yLevel, -gridExtent))
        val p2 = camera.worldToView(Vector3D(x, yLevel, gridExtent))

        val s1 = camera.projectToScreen(p1, width, height)
        val s2 = camera.projectToScreen(p2, width, height)

        if (s1 != null && s2 != null) {
            val color = if (kotlin.math.abs(x) < 1f) axisZColor else gridColor
            drawLine(
                color = color,
                start = Offset(s1.x, s1.y),
                end = Offset(s2.x, s2.y),
                strokeWidth = if (kotlin.math.abs(x) < 1f) 2f else 1f
            )
        }
        x += gridStep
    }

    var z = -gridExtent
    while (z <= gridExtent) {
        val p1 = camera.worldToView(Vector3D(-gridExtent, yLevel, z))
        val p2 = camera.worldToView(Vector3D(gridExtent, yLevel, z))

        val s1 = camera.projectToScreen(p1, width, height)
        val s2 = camera.projectToScreen(p2, width, height)

        if (s1 != null && s2 != null) {
            val color = if (kotlin.math.abs(z) < 1f) axisXColor else gridColor
            drawLine(
                color = color,
                start = Offset(s1.x, s1.y),
                end = Offset(s2.x, s2.y),
                strokeWidth = if (kotlin.math.abs(z) < 1f) 2f else 1f
            )
        }
        z += gridStep
    }
}

private fun DrawScope.renderSingleMesh(
    mesh: Mesh3D,
    paintedFaces: Set<Int>,
    camera: Camera3D,
    width: Float,
    height: Float,
    isWireframe: Boolean
) {
    val lightDir = Vector3D(0.4f, 0.8f, 0.5f).normalize()
    val rimLightDir = Vector3D(-0.4f, -0.6f, -0.6f).normalize()
    val eyePos = camera.getEyePosition()

    val projectedList = ArrayList<ProjectedTriangle>(mesh.triangles.size)

    for (i in mesh.triangles.indices) {
        val tri = mesh.triangles[i]
        val isPainted = paintedFaces.contains(i)

        // View space coordinates
        val v1View = camera.worldToView(tri.v1)
        val v2View = camera.worldToView(tri.v2)
        val v3View = camera.worldToView(tri.v3)

        val s1 = camera.projectToScreen(v1View, width, height) ?: continue
        val s2 = camera.projectToScreen(v2View, width, height) ?: continue
        val s3 = camera.projectToScreen(v3View, width, height) ?: continue

        // 2D Screen Backface Culling
        val cross2D = (s2.x - s1.x) * (s3.y - s1.y) - (s2.y - s1.y) * (s3.x - s1.x)
        val isFront = cross2D < 0 // counter-clockwise in screen coordinates

        // Depth (average view Z)
        val avgDepth = (v1View.z + v2View.z + v3View.z) / 3f

        // Lighting calculation
        val dotKey = maxOf(0f, tri.normal.dot(lightDir))
        val dotRim = maxOf(0f, tri.normal.dot(rimLightDir))
        val brightness = (0.28f + 0.55f * dotKey + 0.17f * dotRim).coerceIn(0.15f, 1.0f)

        val baseColor = if (isPainted) {
            Color(
                red = (0.95f * brightness).coerceIn(0f, 1f),
                green = (0.2f * brightness).coerceIn(0f, 1f),
                blue = (0.2f * brightness).coerceIn(0f, 1f),
                alpha = 1f
            )
        } else {
            Color(
                red = (0.25f * brightness).coerceIn(0f, 1f),
                green = (0.68f * brightness).coerceIn(0f, 1f),
                blue = (0.62f * brightness).coerceIn(0f, 1f),
                alpha = 1f
            )
        }

        val wireColor = if (isPainted) {
            Color(0xFFFF7777)
        } else {
            Color(0x55A7F3D0)
        }

        projectedList.add(
            ProjectedTriangle(
                s1 = s1,
                s2 = s2,
                s3 = s3,
                depth = avgDepth,
                isFrontFacing = isFront,
                color = baseColor,
                wireColor = wireColor,
                originalIndex = i
            )
        )
    }

    // Sort back-to-front (Painter's Algorithm)
    projectedList.sortBy { it.depth }

    val path = Path()
    for (pt in projectedList) {
        if (!pt.isFrontFacing && !isWireframe) continue

        path.reset()
        path.moveTo(pt.s1.x, pt.s1.y)
        path.lineTo(pt.s2.x, pt.s2.y)
        path.lineTo(pt.s3.x, pt.s3.y)
        path.close()

        if (pt.isFrontFacing) {
            drawPath(path, pt.color)
        }

        if (isWireframe) {
            drawPath(path, pt.wireColor, style = Stroke(width = 1f))
        }
    }
}

private fun DrawScope.renderSplitMeshes(
    cutResult: CutResult,
    explodedDistance: Float,
    camera: Camera3D,
    width: Float,
    height: Float,
    isWireframe: Boolean
) {
    val offsetA = cutResult.planeNormal * (explodedDistance * 0.5f)
    val offsetB = cutResult.planeNormal * (-explodedDistance * 0.5f)

    val lightDir = Vector3D(0.4f, 0.8f, 0.5f).normalize()
    val rimLightDir = Vector3D(-0.4f, -0.6f, -0.6f).normalize()

    val allProjected = ArrayList<ProjectedTriangle>()

    // Process Part A (Male Pin - Emerald Teal)
    for (i in cutResult.partA.triangles.indices) {
        val tri = cutResult.partA.triangles[i]
        val v1 = tri.v1 + offsetA
        val v2 = tri.v2 + offsetA
        val v3 = tri.v3 + offsetA

        val v1View = camera.worldToView(v1)
        val v2View = camera.worldToView(v2)
        val v3View = camera.worldToView(v3)

        val s1 = camera.projectToScreen(v1View, width, height) ?: continue
        val s2 = camera.projectToScreen(v2View, width, height) ?: continue
        val s3 = camera.projectToScreen(v3View, width, height) ?: continue

        val cross2D = (s2.x - s1.x) * (s3.y - s1.y) - (s2.y - s1.y) * (s3.x - s1.x)
        val isFront = cross2D < 0
        val avgDepth = (v1View.z + v2View.z + v3View.z) / 3f

        val dotKey = maxOf(0f, tri.normal.dot(lightDir))
        val dotRim = maxOf(0f, tri.normal.dot(rimLightDir))
        val brightness = (0.25f + 0.58f * dotKey + 0.17f * dotRim).coerceIn(0.15f, 1.0f)

        val baseColor = Color(
            red = (0.15f * brightness).coerceIn(0f, 1f),
            green = (0.75f * brightness).coerceIn(0f, 1f),
            blue = (0.60f * brightness).coerceIn(0f, 1f),
            alpha = 1f
        )

        allProjected.add(
            ProjectedTriangle(
                s1, s2, s3, avgDepth, isFront,
                baseColor, Color(0x666EE7B7), i
            )
        )
    }

    // Process Part B (Female Socket - Indigo / Violet)
    for (i in cutResult.partB.triangles.indices) {
        val tri = cutResult.partB.triangles[i]
        val v1 = tri.v1 + offsetB
        val v2 = tri.v2 + offsetB
        val v3 = tri.v3 + offsetB

        val v1View = camera.worldToView(v1)
        val v2View = camera.worldToView(v2)
        val v3View = camera.worldToView(v3)

        val s1 = camera.projectToScreen(v1View, width, height) ?: continue
        val s2 = camera.projectToScreen(v2View, width, height) ?: continue
        val s3 = camera.projectToScreen(v3View, width, height) ?: continue

        val cross2D = (s2.x - s1.x) * (s3.y - s1.y) - (s2.y - s1.y) * (s3.x - s1.x)
        val isFront = cross2D < 0
        val avgDepth = (v1View.z + v2View.z + v3View.z) / 3f

        val dotKey = maxOf(0f, tri.normal.dot(lightDir))
        val dotRim = maxOf(0f, tri.normal.dot(rimLightDir))
        val brightness = (0.25f + 0.58f * dotKey + 0.17f * dotRim).coerceIn(0.15f, 1.0f)

        val baseColor = Color(
            red = (0.42f * brightness).coerceIn(0f, 1f),
            green = (0.35f * brightness).coerceIn(0f, 1f),
            blue = (0.85f * brightness).coerceIn(0f, 1f),
            alpha = 1f
        )

        allProjected.add(
            ProjectedTriangle(
                s1, s2, s3, avgDepth, isFront,
                baseColor, Color(0x66A5B4FC), i
            )
        )
    }

    allProjected.sortBy { it.depth }

    val path = Path()
    for (pt in allProjected) {
        if (!pt.isFrontFacing && !isWireframe) continue

        path.reset()
        path.moveTo(pt.s1.x, pt.s1.y)
        path.lineTo(pt.s2.x, pt.s2.y)
        path.lineTo(pt.s3.x, pt.s3.y)
        path.close()

        if (pt.isFrontFacing) {
            drawPath(path, pt.color)
        }
        if (isWireframe) {
            drawPath(path, pt.wireColor, style = Stroke(width = 1f))
        }
    }
}

private fun DrawScope.drawCutSpline(cutSpline: CutSpline, camera: Camera3D, width: Float, height: Float) {
    val points = cutSpline.sampledPoints
    if (points.size < 2) return

    val projectedPoints = ArrayList<Offset>()
    for (p in points) {
        val v = camera.worldToView(p)
        val s = camera.projectToScreen(v, width, height)
        if (s != null) {
            projectedPoints.add(Offset(s.x, s.y))
        }
    }

    if (projectedPoints.size >= 2) {
        val splinePath = Path()
        splinePath.moveTo(projectedPoints[0].x, projectedPoints[0].y)
        for (i in 1 until projectedPoints.size) {
            splinePath.lineTo(projectedPoints[i].x, projectedPoints[i].y)
        }
        splinePath.close()

        // Outer glow
        drawPath(
            splinePath,
            Color(0x88FACC15),
            style = Stroke(width = 6f)
        )
        // Solid neon line
        drawPath(
            splinePath,
            Color(0xFFFEF08A),
            style = Stroke(width = 3f)
        )
    }
}
