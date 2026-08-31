package com.example.stlpincut.geometry

import com.example.stlpincut.model.CutResult
import com.example.stlpincut.model.CutSpline
import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.PinConfiguration
import com.example.stlpincut.model.PinType
import com.example.stlpincut.model.Triangle
import com.example.stlpincut.model.Vector3D
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

object ModelSplitter {

    fun splitAndGeneratePins(
        mesh: Mesh3D,
        spline: CutSpline,
        pinConfig: PinConfiguration
    ): CutResult {
        val planePoint = spline.center
        val planeNormal = spline.normal.normalize()

        val partATriangles = ArrayList<Triangle>()
        val partBTriangles = ArrayList<Triangle>()
        val cutEdges = ArrayList<Pair<Vector3D, Vector3D>>()

        for (tri in mesh.triangles) {
            val d1 = (tri.v1 - planePoint).dot(planeNormal)
            val d2 = (tri.v2 - planePoint).dot(planeNormal)
            val d3 = (tri.v3 - planePoint).dot(planeNormal)

            val eps = 1e-4f
            val s1 = if (d1 > eps) 1 else if (d1 < -eps) -1 else 0
            val s2 = if (d2 > eps) 1 else if (d2 < -eps) -1 else 0
            val s3 = if (d3 > eps) 1 else if (d3 < -eps) -1 else 0

            if (s1 >= 0 && s2 >= 0 && s3 >= 0) {
                // Entirely on A side
                partATriangles.add(tri)
            } else if (s1 <= 0 && s2 <= 0 && s3 <= 0) {
                // Entirely on B side
                partBTriangles.add(tri)
            } else {
                // Triangle intersects the plane
                clipTriangle(
                    tri, d1, d2, d3,
                    partATriangles, partBTriangles, cutEdges
                )
            }
        }

        // Cap the cut surface for both Part A and Part B using the cut perimeter or spline points
        val capVertices = if (spline.sampledPoints.isNotEmpty()) {
            spline.sampledPoints
        } else {
            reconstructCapPolygon(cutEdges, planePoint, planeNormal)
        }

        if (capVertices.size >= 3) {
            val capCenter = planePoint
            val nCap = capVertices.size
            for (i in 0 until nCap) {
                val p1 = capVertices[i]
                val p2 = capVertices[(i + 1) % nCap]

                // Part A cap faces downwards (-planeNormal)
                partATriangles.add(Triangle(capCenter, p1, p2, planeNormal * -1f))
                // Part B cap faces upwards (+planeNormal)
                partBTriangles.add(Triangle(capCenter, p2, p1, planeNormal))
            }
        }

        // Generate Alignment Pin on Part A and Socket Cavity on Part B
        val pinTrianglesA = generatePinGeometry(planePoint, planeNormal, pinConfig.pinType, pinConfig.pinSizeMm, isMale = true)
        val socketTrianglesB = generatePinGeometry(planePoint, planeNormal, pinConfig.pinType, pinConfig.pinSizeMm * 1.05f, isMale = false)

        partATriangles.addAll(pinTrianglesA)
        partBTriangles.addAll(socketTrianglesB)

        val partAMesh = Mesh3D(
            name = "${mesh.name} - Part A (Male Pin)",
            triangles = partATriangles
        )
        val partBMesh = Mesh3D(
            name = "${mesh.name} - Part B (Female Socket)",
            triangles = partBTriangles
        )

        return CutResult(
            originalMesh = mesh,
            partA = partAMesh,
            partB = partBMesh,
            planePoint = planePoint,
            planeNormal = planeNormal,
            pinType = pinConfig.pinType,
            pinSizeMm = pinConfig.pinSizeMm
        )
    }

    private fun clipTriangle(
        tri: Triangle,
        d1: Float, d2: Float, d3: Float,
        partA: ArrayList<Triangle>,
        partB: ArrayList<Triangle>,
        cutEdges: ArrayList<Pair<Vector3D, Vector3D>>
    ) {
        val v = listOf(tri.v1, tri.v2, tri.v3)
        val d = listOf(d1, d2, d3)

        // Find single vertex on one side vs two vertices on the other
        var singleIndex = 0
        if ((d[0] > 0 && d[1] <= 0 && d[2] <= 0) || (d[0] < 0 && d[1] >= 0 && d[2] >= 0)) {
            singleIndex = 0
        } else if ((d[1] > 0 && d[0] <= 0 && d[2] <= 0) || (d[1] < 0 && d[0] >= 0 && d[2] >= 0)) {
            singleIndex = 1
        } else {
            singleIndex = 2
        }

        val i0 = singleIndex
        val i1 = (singleIndex + 1) % 3
        val i2 = (singleIndex + 2) % 3

        val p0 = v[i0]
        val p1 = v[i1]
        val p2 = v[i2]

        val t01 = (0f - d[i0]) / (d[i1] - d[i0])
        val t02 = (0f - d[i0]) / (d[i2] - d[i0])

        val ip1 = p0 + (p1 - p0) * t01
        val ip2 = p0 + (p2 - p0) * t02

        cutEdges.add(Pair(ip1, ip2))

        if (d[i0] > 0) {
            // p0 is on side A, p1 and p2 on side B
            partA.add(Triangle(p0, ip1, ip2, tri.normal))
            partB.add(Triangle(ip1, p1, p2, tri.normal))
            partB.add(Triangle(ip1, p2, ip2, tri.normal))
        } else {
            // p0 is on side B, p1 and p2 on side A
            partB.add(Triangle(p0, ip1, ip2, tri.normal))
            partA.add(Triangle(ip1, p1, p2, tri.normal))
            partA.add(Triangle(ip1, p2, ip2, tri.normal))
        }
    }

    private fun reconstructCapPolygon(
        edges: List<Pair<Vector3D, Vector3D>>,
        center: Vector3D,
        normal: Vector3D
    ): List<Vector3D> {
        val points = ArrayList<Vector3D>()
        for (e in edges) {
            points.add(e.first)
            points.add(e.second)
        }
        if (points.isEmpty()) return emptyList()

        val refUp = if (kotlin.math.abs(normal.y) < 0.9f) Vector3D.UP else Vector3D.FORWARD
        val tangentU = normal.cross(refUp).normalize()
        val tangentV = normal.cross(tangentU).normalize()

        val unique = points.distinctBy { "${(it.x * 10).toInt()},${(it.y * 10).toInt()},${(it.z * 10).toInt()}" }
        return unique.sortedBy { p ->
            val d = p - center
            atan2(d.dot(tangentV), d.dot(tangentU))
        }
    }

    private fun generatePinGeometry(
        center: Vector3D,
        normal: Vector3D,
        pinType: PinType,
        sizeMm: Float,
        isMale: Boolean
    ): List<Triangle> {
        val triangles = ArrayList<Triangle>()
        val pinDirection = if (isMale) normal else normal * -1f
        val height = sizeMm * 1.2f
        val baseR = sizeMm * 0.7f

        val refUp = if (kotlin.math.abs(pinDirection.y) < 0.9f) Vector3D.UP else Vector3D.FORWARD
        val u = pinDirection.cross(refUp).normalize()
        val v = pinDirection.cross(u).normalize()

        when (pinType) {
            PinType.PYRAMID -> {
                // 4-sided pyramid with tapered top
                val topR = if (isMale) baseR * 0.4f else baseR * 0.42f
                val apexCenter = center + pinDirection * height

                val basePts = listOf(
                    center + (u * -baseR) + (v * -baseR),
                    center + (u * baseR) + (v * -baseR),
                    center + (u * baseR) + (v * baseR),
                    center + (u * -baseR) + (v * baseR)
                )

                val topPts = listOf(
                    apexCenter + (u * -topR) + (v * -topR),
                    apexCenter + (u * topR) + (v * -topR),
                    apexCenter + (u * topR) + (v * topR),
                    apexCenter + (u * -topR) + (v * topR)
                )

                for (i in 0 until 4) {
                    val next = (i + 1) % 4
                    val b1 = basePts[i]
                    val b2 = basePts[next]
                    val t1 = topPts[i]
                    val t2 = topPts[next]

                    if (isMale) {
                        triangles.add(Triangle(b1, b2, t2))
                        triangles.add(Triangle(b1, t2, t1))
                    } else {
                        // Inverted normals for female cavity
                        triangles.add(Triangle(b1, t2, b2))
                        triangles.add(Triangle(b1, t1, t2))
                    }
                }

                // Top cap
                if (isMale) {
                    triangles.add(Triangle(topPts[0], topPts[1], topPts[2]))
                    triangles.add(Triangle(topPts[0], topPts[2], topPts[3]))
                } else {
                    triangles.add(Triangle(topPts[0], topPts[2], topPts[1]))
                    triangles.add(Triangle(topPts[0], topPts[3], topPts[2]))
                }
            }

            PinType.PRISM -> {
                // 8-sided hexagonal/octagonal cylinder prism
                val segments = 8
                val topCenter = center + pinDirection * height

                val basePts = ArrayList<Vector3D>(segments)
                val topPts = ArrayList<Vector3D>(segments)

                for (s in 0 until segments) {
                    val theta = (s * 2.0 * PI / segments).toFloat()
                    val cosT = cos(theta)
                    val sinT = sin(theta)

                    basePts.add(center + (u * (baseR * cosT)) + (v * (baseR * sinT)))
                    topPts.add(topCenter + (u * (baseR * cosT)) + (v * (baseR * sinT)))
                }

                for (i in 0 until segments) {
                    val next = (i + 1) % segments
                    val b1 = basePts[i]
                    val b2 = basePts[next]
                    val t1 = topPts[i]
                    val t2 = topPts[next]

                    if (isMale) {
                        triangles.add(Triangle(b1, b2, t2))
                        triangles.add(Triangle(b1, t2, t1))
                    } else {
                        triangles.add(Triangle(b1, t2, b2))
                        triangles.add(Triangle(b1, t1, t2))
                    }
                }

                // Top cap
                for (i in 0 until segments) {
                    val next = (i + 1) % segments
                    if (isMale) {
                        triangles.add(Triangle(topCenter, topPts[i], topPts[next]))
                    } else {
                        triangles.add(Triangle(topCenter, topPts[next], topPts[i]))
                    }
                }
            }
        }

        return triangles
    }
}
