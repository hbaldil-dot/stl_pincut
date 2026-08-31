package com.example.stlpincut.graphics

import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.Triangle
import com.example.stlpincut.model.Vector3D
import kotlin.math.sqrt

object RayPicker {

    data class Ray(val origin: Vector3D, val direction: Vector3D)

    fun pickAndPaint(
        mesh: Mesh3D,
        camera: Camera3D,
        screenX: Float,
        screenY: Float,
        screenWidth: Float,
        screenHeight: Float,
        brushSizeMm: Float,
        currentPainted: Set<Int>
    ): List<Int> {
        val eyePos = camera.getEyePosition()
        val forward = camera.getForward()
        val right = camera.getRight()
        val up = camera.getUp()

        val aspect = screenWidth / screenHeight
        val fovRad = (camera.fovDeg * Math.PI / 180.0).toFloat()
        val halfFovTan = kotlin.math.tan(fovRad * 0.5f)

        // Convert screen coordinates to NDC [-1, 1]
        val ndcX = (2f * screenX / screenWidth - 1f) * aspect * halfFovTan
        val ndcY = (1f - 2f * screenY / screenHeight) * halfFovTan

        val rayDir = (forward + (right * ndcX) + (up * ndcY)).normalize()
        val ray = Ray(eyePos, rayDir)

        // Find closest front-facing triangle intersection
        var closestDist = Float.MAX_VALUE
        var hitPoint: Vector3D? = null

        for (i in mesh.triangles.indices) {
            val tri = mesh.triangles[i]
            val toCam = (eyePos - tri.center).normalize()
            if (tri.normal.dot(toCam) <= -0.1f) continue // backface culling

            val t = intersectRayTriangle(ray, tri.v1, tri.v2, tri.v3)
            if (t != null && t > 0f && t < closestDist) {
                closestDist = t
                hitPoint = ray.origin + (ray.direction * t)
            }
        }

        // If no direct triangle hit, check 2D projected proximity to face centers
        if (hitPoint == null) {
            var closestProjDist = Float.MAX_VALUE
            for (i in mesh.triangles.indices) {
                val tri = mesh.triangles[i]
                val toCam = (eyePos - tri.center).normalize()
                if (tri.normal.dot(toCam) <= -0.1f) continue

                val viewPos = camera.worldToView(tri.center)
                val screenPos = camera.projectToScreen(viewPos, screenWidth, screenHeight) ?: continue
                val dx = screenPos.x - screenX
                val dy = screenPos.y - screenY
                val projDist = sqrt(dx * dx + dy * dy)
                if (projDist < 40f && projDist < closestProjDist) {
                    closestProjDist = projDist
                    hitPoint = tri.center
                }
            }
        }

        if (hitPoint == null) return emptyList()

        // Collect all faces within brush radius
        val newlyPainted = ArrayList<Int>()
        for (i in mesh.triangles.indices) {
            if (currentPainted.contains(i)) continue
            val tri = mesh.triangles[i]
            val toCam = (eyePos - tri.center).normalize()
            if (tri.normal.dot(toCam) <= -0.1f) continue

            val dist = tri.center.distanceTo(hitPoint)
            if (dist <= brushSizeMm) {
                newlyPainted.add(i)
            }
        }

        return newlyPainted
    }

    // Möller–Trumbore ray-triangle intersection algorithm
    private fun intersectRayTriangle(ray: Ray, v0: Vector3D, v1: Vector3D, v2: Vector3D): Float? {
        val edge1 = v1 - v0
        val edge2 = v2 - v0
        val pvec = ray.direction.cross(edge2)
        val det = edge1.dot(pvec)

        if (det > -1e-6f && det < 1e-6f) return null
        val invDet = 1f / det

        val tvec = ray.origin - v0
        val u = tvec.dot(pvec) * invDet
        if (u < 0f || u > 1f) return null

        val qvec = tvec.cross(edge1)
        val v = ray.direction.dot(qvec) * invDet
        if (v < 0f || u + v > 1f) return null

        val t = edge2.dot(qvec) * invDet
        return if (t > 1e-4f) t else null
    }
}
