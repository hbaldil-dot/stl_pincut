package com.example.stlpincut.model

enum class PinType(val displayName: String, val turkishName: String) {
    PYRAMID("Tapered Pyramid", "Uca Daralan Prizma / Piramit"),
    PRISM("Straight Prism / Dowel", "Düz Prizma")
}

data class PinConfiguration(
    val pinType: PinType = PinType.PYRAMID,
    val pinSizeMm: Float = 5f,
    val brushSizeMm: Float = 5f,
    val isWireframe: Boolean = true,
    val explodedDistance: Float = 0f
)

data class CutSpline(
    val sampledPoints: List<Vector3D> = emptyList(),
    val center: Vector3D = Vector3D.ZERO,
    val normal: Vector3D = Vector3D.UP
)

data class CutResult(
    val originalMesh: Mesh3D,
    val partA: Mesh3D,
    val partB: Mesh3D,
    val planePoint: Vector3D,
    val planeNormal: Vector3D,
    val pinType: PinType,
    val pinSizeMm: Float
)
