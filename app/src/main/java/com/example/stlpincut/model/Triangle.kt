package com.example.stlpincut.model

data class Triangle(
    val v1: Vector3D,
    val v2: Vector3D,
    val v3: Vector3D,
    val normal: Vector3D = computeNormal(v1, v2, v3)
) {
    val center: Vector3D get() = (v1 + v2 + v3) / 3f

    companion object {
        fun computeNormal(v1: Vector3D, v2: Vector3D, v3: Vector3D): Vector3D {
            val edge1 = v2 - v1
            val edge2 = v3 - v1
            return edge1.cross(edge2).normalize()
        }
    }
}
