package com.example.stlpincut.graphics

import com.example.stlpincut.model.Vector3D
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

data class Camera3D(
    val yawDeg: Float = 35f,
    val pitchDeg: Float = 25f,
    val distance: Float = 140f,
    val panX: Float = 0f,
    val panY: Float = 0f,
    val fovDeg: Float = 50f
) {
    fun getEyePosition(): Vector3D {
        val yawRad = (yawDeg * PI / 180f).toFloat()
        val pitchRad = (pitchDeg * PI / 180f).toFloat()

        val cosP = cos(pitchRad)
        val sinP = sin(pitchRad)
        val cosY = cos(yawRad)
        val sinY = sin(yawRad)

        return Vector3D(
            x = distance * cosP * sinY,
            y = distance * sinP,
            z = distance * cosP * cosY
        )
    }

    fun getForward(): Vector3D {
        return (Vector3D.ZERO - getEyePosition()).normalize()
    }

    fun getRight(): Vector3D {
        val fwd = getForward()
        return fwd.cross(Vector3D.UP).normalize()
    }

    fun getUp(): Vector3D {
        val fwd = getForward()
        val right = getRight()
        return right.cross(fwd).normalize()
    }

    /**
     * Transform a 3D world coordinate to View (camera) space
     */
    fun worldToView(v: Vector3D): Vector3D {
        val yawRad = (-yawDeg * PI / 180f).toFloat()
        val pitchRad = (-pitchDeg * PI / 180f).toFloat()

        // 1. Rotate around Y (yaw)
        val cosY = cos(yawRad)
        val sinY = sin(yawRad)
        val x1 = v.x * cosY + v.z * sinY
        val y1 = v.y
        val z1 = -v.x * sinY + v.z * cosY

        // 2. Rotate around X (pitch)
        val cosP = cos(pitchRad)
        val sinP = sin(pitchRad)
        val x2 = x1
        val y2 = y1 * cosP - z1 * sinP
        val z2 = y1 * sinP + z1 * cosP

        // 3. Translate by camera distance and pan
        return Vector3D(
            x = x2 + panX,
            y = y2 + panY,
            z = z2 - distance
        )
    }

    /**
     * Project a view-space coordinate into 2D screen coordinates
     */
    fun projectToScreen(viewPos: Vector3D, screenWidth: Float, screenHeight: Float): Vector3D? {
        val near = 1f
        if (viewPos.z >= -near) return null // behind camera

        val aspect = screenWidth / screenHeight
        val fovRad = (fovDeg * PI / 180f).toFloat()
        val f = 1.0f / kotlin.math.tan(fovRad / 2.0f)

        val projX = (viewPos.x * (f / aspect)) / -viewPos.z
        val projY = (viewPos.y * f) / -viewPos.z

        val screenX = (projX * 0.5f + 0.5f) * screenWidth
        val screenY = (-projY * 0.5f + 0.5f) * screenHeight

        return Vector3D(screenX, screenY, -viewPos.z)
    }
}
