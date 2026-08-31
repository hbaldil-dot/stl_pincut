package com.example.stlpincut.stl

import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.Triangle
import com.example.stlpincut.model.Vector3D
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

object SampleModels {

    fun getSampleList(): List<Pair<String, () -> Mesh3D>> = listOf(
        "Low-Poly Figurine / Heykel" to ::generateBustModel,
        "Mechanical Bracket / Braket" to ::generateBracketModel,
        "Cylinder Joint / Silindir Mafsal" to ::generateCylinderConnectorModel,
        "Geometric Prism / Prizma" to ::generatePrismModel
    )

    fun generateBustModel(): Mesh3D {
        val triangles = ArrayList<Triangle>()

        // Octagonal tiered sculpture (Base, Torso, Neck, Head, Crown)
        val layers = listOf(
            // y, radius, numSegments
            Pair(-35f, 22f), // Base bottom
            Pair(-30f, 25f), // Base rim
            Pair(-25f, 20f), // Base top
            Pair(-15f, 15f), // Waist
            Pair(0f, 20f),   // Chest
            Pair(12f, 12f),  // Shoulders / Neck
            Pair(20f, 16f),  // Head jaw
            Pair(28f, 17f),  // Head brow
            Pair(34f, 12f),  // Head top
            Pair(38f, 0f)    // Apex
        )

        val segments = 12
        for (l in 0 until layers.size - 1) {
            val (y1, r1) = layers[l]
            val (y2, r2) = layers[l + 1]

            for (s in 0 until segments) {
                val theta1 = (s * 2.0 * PI / segments).toFloat()
                val theta2 = ((s + 1) * 2.0 * PI / segments).toFloat()

                val v1 = Vector3D(r1 * cos(theta1), y1, r1 * sin(theta1))
                val v2 = Vector3D(r1 * cos(theta2), y1, r1 * sin(theta2))
                val v3 = Vector3D(r2 * cos(theta2), y2, r2 * sin(theta2))
                val v4 = Vector3D(r2 * cos(theta1), y2, r2 * sin(theta1))

                if (r1 > 0f && r2 > 0f) {
                    triangles.add(Triangle(v1, v2, v3))
                    triangles.add(Triangle(v1, v3, v4))
                } else if (r2 == 0f) {
                    val apex = Vector3D(0f, y2, 0f)
                    triangles.add(Triangle(v1, v2, apex))
                }
            }
        }

        // Base bottom cap
        val baseCenter = Vector3D(0f, -35f, 0f)
        val rBase = 22f
        for (s in 0 until segments) {
            val theta1 = (s * 2.0 * PI / segments).toFloat()
            val theta2 = ((s + 1) * 2.0 * PI / segments).toFloat()
            val v1 = Vector3D(rBase * cos(theta1), -35f, rBase * sin(theta1))
            val v2 = Vector3D(rBase * cos(theta2), -35f, rBase * sin(theta2))
            triangles.add(Triangle(baseCenter, v2, v1))
        }

        val (normalized, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = "Low-Poly Figurine", triangles = normalized)
    }

    fun generateBracketModel(): Mesh3D {
        val triangles = ArrayList<Triangle>()

        // L-shaped bracket formed with box primitives
        fun addBox(min: Vector3D, max: Vector3D) {
            val v000 = Vector3D(min.x, min.y, min.z)
            val v100 = Vector3D(max.x, min.y, min.z)
            val v110 = Vector3D(max.x, max.y, min.z)
            val v010 = Vector3D(min.x, max.y, min.z)

            val v001 = Vector3D(min.x, min.y, max.z)
            val v101 = Vector3D(max.x, min.y, max.z)
            val v111 = Vector3D(max.x, max.y, max.z)
            val v011 = Vector3D(min.x, max.y, max.z)

            // Front
            triangles.add(Triangle(v001, v101, v111))
            triangles.add(Triangle(v001, v111, v011))
            // Back
            triangles.add(Triangle(v100, v000, v010))
            triangles.add(Triangle(v100, v010, v110))
            // Left
            triangles.add(Triangle(v000, v001, v011))
            triangles.add(Triangle(v000, v011, v010))
            // Right
            triangles.add(Triangle(v101, v100, v110))
            triangles.add(Triangle(v101, v110, v111))
            // Top
            triangles.add(Triangle(v011, v111, v110))
            triangles.add(Triangle(v011, v110, v010))
            // Bottom
            triangles.add(Triangle(v000, v100, v101))
            triangles.add(Triangle(v000, v101, v001))
        }

        // Horizontal base plate
        addBox(Vector3D(-25f, -25f, -15f), Vector3D(25f, -15f, 15f))
        // Vertical back wall
        addBox(Vector3D(-25f, -15f, -15f), Vector3D(-15f, 25f, 15f))
        // Triangular reinforcement gusset
        val g1 = Vector3D(-15f, -15f, -3f)
        val g2 = Vector3D(10f, -15f, -3f)
        val g3 = Vector3D(-15f, 15f, -3f)
        val g4 = Vector3D(-15f, -15f, 3f)
        val g5 = Vector3D(10f, -15f, 3f)
        val g6 = Vector3D(-15f, 15f, 3f)

        triangles.add(Triangle(g1, g2, g3))
        triangles.add(Triangle(g6, g5, g4))
        triangles.add(Triangle(g2, g5, g6))
        triangles.add(Triangle(g2, g6, g3))

        val (normalized, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = "Mechanical Bracket", triangles = normalized)
    }

    fun generateCylinderConnectorModel(): Mesh3D {
        val triangles = ArrayList<Triangle>()
        val segments = 18

        fun addCylinder(yBottom: Float, yTop: Float, radius: Float) {
            for (s in 0 until segments) {
                val t1 = (s * 2.0 * PI / segments).toFloat()
                val t2 = ((s + 1) * 2.0 * PI / segments).toFloat()

                val v1 = Vector3D(radius * cos(t1), yBottom, radius * sin(t1))
                val v2 = Vector3D(radius * cos(t2), yBottom, radius * sin(t2))
                val v3 = Vector3D(radius * cos(t2), yTop, radius * sin(t2))
                val v4 = Vector3D(radius * cos(t1), yTop, radius * sin(t1))

                triangles.add(Triangle(v1, v2, v3))
                triangles.add(Triangle(v1, v3, v4))
            }
        }

        // Lower cylinder
        addCylinder(-30f, -5f, 14f)
        // Middle flange collar
        addCylinder(-5f, 5f, 22f)
        // Upper cylinder
        addCylinder(5f, 30f, 14f)

        // Top and Bottom Caps
        val topCenter = Vector3D(0f, 30f, 0f)
        val bottomCenter = Vector3D(0f, -30f, 0f)
        for (s in 0 until segments) {
            val t1 = (s * 2.0 * PI / segments).toFloat()
            val t2 = ((s + 1) * 2.0 * PI / segments).toFloat()
            // Top
            val tv1 = Vector3D(14f * cos(t1), 30f, 14f * sin(t1))
            val tv2 = Vector3D(14f * cos(t2), 30f, 14f * sin(t2))
            triangles.add(Triangle(topCenter, tv1, tv2))

            // Bottom
            val bv1 = Vector3D(14f * cos(t1), -30f, 14f * sin(t1))
            val bv2 = Vector3D(14f * cos(t2), -30f, 14f * sin(t2))
            triangles.add(Triangle(bottomCenter, bv2, bv1))

            // Flange step rings
            val f1_in = Vector3D(14f * cos(t1), -5f, 14f * sin(t1))
            val f2_in = Vector3D(14f * cos(t2), -5f, 14f * sin(t2))
            val f1_out = Vector3D(22f * cos(t1), -5f, 22f * sin(t1))
            val f2_out = Vector3D(22f * cos(t2), -5f, 22f * sin(t2))
            triangles.add(Triangle(f1_in, f2_in, f2_out))
            triangles.add(Triangle(f1_in, f2_out, f1_out))

            val uf1_in = Vector3D(14f * cos(t1), 5f, 14f * sin(t1))
            val uf2_in = Vector3D(14f * cos(t2), 5f, 14f * sin(t2))
            val uf1_out = Vector3D(22f * cos(t1), 5f, 22f * sin(t1))
            val uf2_out = Vector3D(22f * cos(t2), 5f, 22f * sin(t2))
            triangles.add(Triangle(uf1_in, uf2_out, uf2_in))
            triangles.add(Triangle(uf1_in, uf1_out, uf2_out))
        }

        val (normalized, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = "Cylinder Connector", triangles = normalized)
    }

    fun generatePrismModel(): Mesh3D {
        val triangles = ArrayList<Triangle>()
        val sides = 6
        val r = 20f
        val h = 25f

        for (s in 0 until sides) {
            val t1 = (s * 2.0 * PI / sides).toFloat()
            val t2 = ((s + 1) * 2.0 * PI / sides).toFloat()

            val v1 = Vector3D(r * cos(t1), -h, r * sin(t1))
            val v2 = Vector3D(r * cos(t2), -h, r * sin(t2))
            val v3 = Vector3D(r * cos(t2), h, r * sin(t2))
            val v4 = Vector3D(r * cos(t1), h, r * sin(t1))

            triangles.add(Triangle(v1, v2, v3))
            triangles.add(Triangle(v1, v3, v4))

            // Cap bottom
            triangles.add(Triangle(Vector3D(0f, -h, 0f), v2, v1))
            // Cap top
            triangles.add(Triangle(Vector3D(0f, h, 0f), v3, v4))
        }

        val (normalized, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = "Hexagonal Prism", triangles = normalized)
    }
}
