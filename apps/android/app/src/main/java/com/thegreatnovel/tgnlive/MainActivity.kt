package com.thegreatnovel.tgnlive

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels

class MainActivity : ComponentActivity() {
    private val model: LiveViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { LiveApp(model) }
    }
    override fun onStop() { super.onStop(); if(!isChangingConfigurations) model.background() }
    override fun onStart() { super.onStart(); model.resume() }
}
