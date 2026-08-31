package com.example.stlpincut

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.stlpincut.ui.MainScreen
import com.example.stlpincut.ui.theme.DarkGray950
import com.example.stlpincut.ui.theme.StlPinCutTheme
import com.example.stlpincut.viewmodel.StlPinCutViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: StlPinCutViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StlPinCutTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkGray950
                ) {
                    MainScreen(viewModel = viewModel)
                }
            }
        }
    }
}
