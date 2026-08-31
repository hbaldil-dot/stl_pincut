package com.example.stlpincut.model

import kotlin.math.max
import kotlin.math.min

data class BoundingBox(
    val min: Vector3D,
    val max: Vector3D
) {
    val size: Vector3D get() = max - min
    val center: Vector3D get() = (min + max) * 0.5f
    val maxDimension: Float get() = maxOf(size.x, size.y, size.z)
}

data class Mesh3D(
    val name: String = "Model",
    val triangles: List<Triangle> = emptyList(),
    val boundingBox: BoundingBox = computeBoundingBox(triangles)
) {
    val faceCount: Int get() = triangles.size

    companion object {
        fun computeBoundingBox(triangles: List<Triangle>): BoundingBox {
            if (triangles.isEmpty()) {
                return BoundingBox(Vector3D.ZERO, Vector3D.ZERO)
            }
            var minX = Float.MAX_VALUE
            var minY = Float.MAX_VALUE
            var minZ = Float.MAX_VALUE
            var maxX = -Float.MAX_VALUE
            var maxY = -Float.MAX_VALUE
            var maxZ = -Float.MAX_VALUE

            for (tri in triangles) {
                for (v in listOf(tri.v1, tri.v2, tri.v3)) {
                    minX = min(minX, v.x)
                    minY = min(minY, v.y)
                    minZ = min(minZ, v.z)
                    maxX = max(maxX, v.x)
                    maxY = max(maxY, v.y)
                    maxZ = max(maxZ, v.z)
                }
            }
            return BoundingBox(
                min = Vector3D(minX, minY, minZ),
                max = Vector3D(maxX, maxY, maxZ)
            )
        }

        fun centerAndNormalize(triangles: List<Triangle>, targetScale: Float = 60f): Pair<List<Triangle>, Float> {
            val bb = computeBoundingBox(triangles)
            val center = bb.center
            val maxDim = bb.maxDimension
            val scale = if (maxDim > 1e-4f) targetScale / maxDim else 1f

            val normalized = triangles.map { tri ->
                Triangle(
                    v1 = (tri.v1 - center) * scale,
                    v2 = (tri.v2 - center) * scale,
                    v3 = (tri.v3 - center) * scale,
                    normal = tri.normal
                )
            }
            return Pair(normalized, scale)
        }
    }
}
