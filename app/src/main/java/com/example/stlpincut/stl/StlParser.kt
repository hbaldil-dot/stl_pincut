package com.example.stlpincut.stl

import com.example.stlpincut.model.Mesh3D
import com.example.stlpincut.model.Triangle
import com.example.stlpincut.model.Vector3D
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.io.InputStreamReader
import java.nio.ByteBuffer
import java.nio.ByteOrder

object StlParser {

    fun parse(inputStream: InputStream, name: String = "ImportedModel"): Mesh3D {
        val bytes = inputStream.readBytes()
        return parseBytes(bytes, name)
    }

    fun parseBytes(bytes: ByteArray, name: String = "ImportedModel"): Mesh3D {
        if (bytes.size < 84) {
            return Mesh3D(name = name, triangles = emptyList())
        }

        // Check if ASCII or Binary
        if (isAscii(bytes)) {
            val asciiMesh = parseAscii(bytes, name)
            if (asciiMesh.triangles.isNotEmpty()) {
                return asciiMesh
            }
        }

        return parseBinary(bytes, name)
    }

    private fun isAscii(bytes: ByteArray): Boolean {
        val header = String(bytes, 0, minOf(bytes.size, 512), Charsets.US_ASCII).trimStart()
        if (header.startsWith("solid", ignoreCase = true)) {
            // Further verify if it has "facet" in the first 500 bytes
            return header.contains("facet", ignoreCase = true)
        }
        return false
    }

    private fun parseBinary(bytes: ByteArray, name: String): Mesh3D {
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        // Skip 80 byte header
        buffer.position(80)
        val numTriangles = buffer.int

        val triangles = ArrayList<Triangle>(minOf(numTriangles, 50000))
        var count = 0

        while (buffer.remaining() >= 50 && count < numTriangles) {
            val nx = buffer.float
            val ny = buffer.float
            val nz = buffer.float

            val v1x = buffer.float
            val v1y = buffer.float
            val v1z = buffer.float

            val v2x = buffer.float
            val v2y = buffer.float
            val v2z = buffer.float

            val v3x = buffer.float
            val v3y = buffer.float
            val v3z = buffer.float

            // Attribute byte count (2 bytes)
            buffer.short

            val v1 = Vector3D(v1x, v1y, v1z)
            val v2 = Vector3D(v2x, v2y, v2z)
            val v3 = Vector3D(v3x, v3y, v3z)
            var normal = Vector3D(nx, ny, nz)
            if (normal.lengthSquared() < 1e-4f) {
                normal = Triangle.computeNormal(v1, v2, v3)
            }

            triangles.add(Triangle(v1, v2, v3, normal))
            count++
        }

        val (normalizedTris, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = name, triangles = normalizedTris)
    }

    private fun parseAscii(bytes: ByteArray, name: String): Mesh3D {
        val reader = BufferedReader(InputStreamReader(ByteArrayInputStream(bytes)))
        val triangles = ArrayList<Triangle>()

        var currentNormal: Vector3D? = null
        val currentVertices = ArrayList<Vector3D>(3)

        var line = reader.readLine()
        while (line != null) {
            val trimmed = line.trim()
            if (trimmed.startsWith("facet normal", ignoreCase = true)) {
                val parts = trimmed.split("\\s+".toRegex())
                if (parts.size >= 4) {
                    val nx = parts[2].toFloatOrNull() ?: 0f
                    val ny = parts[3].toFloatOrNull() ?: 0f
                    val nz = parts[4].toFloatOrNull() ?: 0f
                    currentNormal = Vector3D(nx, ny, nz)
                }
                currentVertices.clear()
            } else if (trimmed.startsWith("vertex", ignoreCase = true)) {
                val parts = trimmed.split("\\s+".toRegex())
                if (parts.size >= 4) {
                    val vx = parts[1].toFloatOrNull() ?: 0f
                    val vy = parts[2].toFloatOrNull() ?: 0f
                    val vz = parts[3].toFloatOrNull() ?: 0f
                    currentVertices.add(Vector3D(vx, vy, vz))
                }
            } else if (trimmed.startsWith("endfacet", ignoreCase = true)) {
                if (currentVertices.size == 3) {
                    val v1 = currentVertices[0]
                    val v2 = currentVertices[1]
                    val v3 = currentVertices[2]
                    val normal = currentNormal ?: Triangle.computeNormal(v1, v2, v3)
                    triangles.add(Triangle(v1, v2, v3, normal))
                }
                currentVertices.clear()
                currentNormal = null
            }
            line = reader.readLine()
        }

        if (triangles.isEmpty()) {
            return Mesh3D(name = name, triangles = emptyList())
        }

        val (normalizedTris, _) = Mesh3D.centerAndNormalize(triangles, 50f)
        return Mesh3D(name = name, triangles = normalizedTris)
    }
}
