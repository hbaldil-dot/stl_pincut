package com.example.stlpincut.model

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class Vector3D(
    val x: Float = 0f,
    val y: Float = 0f,
    val z: Float = 0f
) {
    operator fun plus(other: Vector3D) = Vector3D(x + other.x, y + other.y, z + other.z)
    operator fun minus(other: Vector3D) = Vector3D(x - other.x, y - other.y, z - other.z)
    operator fun times(scalar: Float) = Vector3D(x * scalar, y * scalar, z * scalar)
    operator fun div(scalar: Float) = if (scalar != 0f) Vector3D(x / scalar, y / scalar, z / scalar) else Vector3D()

    fun dot(other: Vector3D): Float = x * other.x + y * other.y + z * other.z

    fun cross(other: Vector3D): Vector3D = Vector3D(
        y * other.z - z * other.y,
        z * other.x - x * other.z,
        x * other.y - y * other.x
    )

    fun length(): Float = sqrt(x * x + y * y + z * z)
    fun lengthSquared(): Float = x * x + y * y + z * z

    fun normalize(): Vector3D {
        val len = length()
        return if (len > 1e-6f) this / len else Vector3D(0f, 0f, 0f)
    }

    fun distanceTo(other: Vector3D): Float = (this - other).length()

    companion object {
        val ZERO = Vector3D(0f, 0f, 0f)
        val UP = Vector3D(0f, 1f, 0f)
        val FORWARD = Vector3D(0f, 0f, 1f)
        val RIGHT = Vector3D(1f, 0f, 0f)
    }
}
