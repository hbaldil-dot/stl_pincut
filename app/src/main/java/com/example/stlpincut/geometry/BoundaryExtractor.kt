package com.example.stlpincut.geometry

import com.example.stlpincut.model.CutSpline
import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.Vector3D
import kotlin.math.atan2
import kotlin.math.roundToInt

object BoundaryExtractor {

    private fun vertexKey(v: Vector3D): String {
        val rx = (v.x * 100).roundToInt() / 100f
        val ry = (v.y * 100).roundToInt() / 100f
        val rz = (v.z * 100).roundToInt() / 100f
        return "$rx,$ry,$rz"
    }

    private data class Edge(val p1: Vector3D, val p2: Vector3D)

    fun extractCutSpline(mesh: Mesh3D, paintedFaces: Set<Int>): CutSpline? {
        if (paintedFaces.isEmpty() || mesh.triangles.isEmpty()) return null

        val edgeCounts = HashMap<String, Pair<Int, Edge>>()

        for (faceIdx in paintedFaces) {
            if (faceIdx !in mesh.triangles.indices) continue
            val tri = mesh.triangles[faceIdx]
            val edges = listOf(
                Pair(tri.v1, tri.v2),
                Pair(tri.v2, tri.v3),
                Pair(tri.v3, tri.v1)
            )

            for ((p1, p2) in edges) {
                val k1 = vertexKey(p1)
                val k2 = vertexKey(p2)
                val edgeKey = if (k1 < k2) "${k1}_$k2" else "${k2}_$k1"

                val current = edgeCounts[edgeKey]
                if (current == null) {
                    edgeCounts[edgeKey] = Pair(1, Edge(p1, p2))
                } else {
                    edgeCounts[edgeKey] = Pair(current.first + 1, current.second)
                }
            }
        }

        // Boundary edges have count == 1
        val boundaryPoints = ArrayList<Vector3D>()
        for ((_, pair) in edgeCounts) {
            if (pair.first == 1) {
                boundaryPoints.add(pair.second.p1)
                boundaryPoints.add(pair.second.p2)
            }
        }

        if (boundaryPoints.size < 3) return null

        // Collect unique boundary points
        val uniquePoints = ArrayList<Vector3D>()
        val seen = HashSet<String>()
        for (p in boundaryPoints) {
            val k = vertexKey(p)
            if (seen.add(k)) {
                uniquePoints.add(p)
            }
        }

        if (uniquePoints.size < 3) return null

        // Calculate center
        var center = Vector3D.ZERO
        for (p in uniquePoints) {
            center = center + p
        }
        center = center / uniquePoints.size.toFloat()

        // Estimate normal from painted face normals
        var avgNormal = Vector3D.ZERO
        for (faceIdx in paintedFaces) {
            if (faceIdx in mesh.triangles.indices) {
                avgNormal = avgNormal + mesh.triangles[faceIdx].normal
            }
        }
        val planeNormal = if (avgNormal.lengthSquared() > 1e-4f) avgNormal.normalize() else Vector3D.UP

        // Determine reference tangent vectors on the plane for radial sorting
        val refUp = if (kotlin.math.abs(planeNormal.y) < 0.9f) Vector3D.UP else Vector3D.FORWARD
        val tangentU = planeNormal.cross(refUp).normalize()
        val tangentV = planeNormal.cross(tangentU).normalize()

        // Radially sort boundary points using angle in plane coordinate system
        uniquePoints.sortWith(Comparator { a, b ->
            val da = a - center
            val db = b - center
            val uA = da.dot(tangentU)
            val vA = da.dot(tangentV)
            val angleA = atan2(vA, uA)

            val uB = db.dot(tangentU)
            val vB = db.dot(tangentV)
            val angleB = atan2(vB, uB)

            angleA.compareTo(angleB)
        })

        // Generate smooth Catmull-Rom closed spline with 150 points
        val sampledPoints = sampleCatmullRom(uniquePoints, sampleCount = 150)
        return CutSpline(
            sampledPoints = sampledPoints,
            center = center,
            normal = planeNormal
        )
    }

    private fun sampleCatmullRom(points: List<Vector3D>, sampleCount: Int): List<Vector3D> {
        val n = points.size
        if (n < 3) return points

        val result = ArrayList<Vector3D>(sampleCount)
        val samplesPerSegment = (sampleCount / n).coerceAtLeast(1)

        for (i in 0 until n) {
            val p0 = points[(i - 1 + n) % n]
            val p1 = points[i]
            val p2 = points[(i + 1) % n]
            val p3 = points[(i + 2) % n]

            for (s in 0 until samplesPerSegment) {
                val t = s.toFloat() / samplesPerSegment
                result.add(catmullRomPoint(p0, p1, p2, p3, t))
            }
        }
        return result
    }

    private fun catmullRomPoint(p0: Vector3D, p1: Vector3D, p2: Vector3D, p3: Vector3D, t: Float): Vector3D {
        val t2 = t * t
        val t3 = t2 * t

        val f0 = -0.5f * t3 + t2 - 0.5f * t
        val f1 = 1.5f * t3 - 2.5f * t2 + 1.0f
        val f2 = -1.5f * t3 + 2.0f * t2 + 0.5f * t
        val f3 = 0.5f * t3 - 0.5f * t2

        return p0 * f0 + p1 * f1 + p2 * f2 + p3 * f3
    }
}
