package com.example.stlpincut.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Emerald400,
    onPrimary = DarkGray950,
    primaryContainer = Emerald900,
    onPrimaryContainer = Emerald100,
    secondary = Cyan400,
    onSecondary = DarkGray950,
    secondaryContainer = DarkGray800,
    onSecondaryContainer = Cyan400,
    tertiary = Amber400,
    onTertiary = DarkGray950,
    background = DarkGray950,
    onBackground = Color(0xFFF3F4F6),
    surface = DarkGray900,
    onSurface = Color(0xFFF3F4F6),
    surfaceVariant = DarkGray800,
    onSurfaceVariant = Color(0xFF9CA3AF),
    outline = DarkGray700,
    error = Red500,
    onError = Color.White
)

@Composable
fun StlPinCutTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
