package com.example.stlpincut.stl

import com.example.stlpincut.model.Mesh3D
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

object StlExporter {

    fun exportToBytes(mesh: Mesh3D, headerText: String = "STL PinCut 3D Android Model"): ByteArray {
        val baos = ByteArrayOutputStream()
        writeToStream(mesh, baos, headerText)
        return baos.toByteArray()
    }

    fun exportToFile(mesh: Mesh3D, file: File, headerText: String = "STL PinCut 3D Android Model") {
        FileOutputStream(file).use { fos ->
            writeToStream(mesh, fos, headerText)
        }
    }

    fun writeToStream(mesh: Mesh3D, outputStream: OutputStream, headerText: String = "STL PinCut 3D Android Model") {
        // 80-byte header
        val headerBytes = ByteArray(80)
        val asciiHeader = headerText.take(79).toByteArray(Charsets.US_ASCII)
        System.arraycopy(asciiHeader, 0, headerBytes, 0, asciiHeader.size)
        outputStream.write(headerBytes)

        // 4-byte triangle count
        val countBuffer = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        countBuffer.putInt(mesh.triangles.size)
        outputStream.write(countBuffer.array())

        // Triangles (50 bytes each)
        val triBuffer = ByteBuffer.allocate(50).order(ByteOrder.LITTLE_ENDIAN)
        for (tri in mesh.triangles) {
            triBuffer.clear()
            // Normal
            triBuffer.putFloat(tri.normal.x)
            triBuffer.putFloat(tri.normal.y)
            triBuffer.putFloat(tri.normal.z)

            // V1
            triBuffer.putFloat(tri.v1.x)
            triBuffer.putFloat(tri.v1.y)
            triBuffer.putFloat(tri.v1.z)

            // V2
            triBuffer.putFloat(tri.v2.x)
            triBuffer.putFloat(tri.v2.y)
            triBuffer.putFloat(tri.v2.z)

            // V3
            triBuffer.putFloat(tri.v3.x)
            triBuffer.putFloat(tri.v3.y)
            triBuffer.putFloat(tri.v3.z)

            // Attribute byte count (2 bytes)
            triBuffer.putShort(0)

            outputStream.write(triBuffer.array())
        }
        outputStream.flush()
    }
}
