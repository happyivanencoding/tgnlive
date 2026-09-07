package com.thegreatnovel.tgnlive

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Rule
import org.junit.Test

/** Uses the real Activity and endpoint; no synthetic story or generation is installed. */
class NativeUiSmokeTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()
    @Test fun realShellSettingsFiveLanguagesAndNavigation() {
        compose.onNodeWithTag("settings").performClick()
        listOf("zh","en","fr","es","ar").forEach { lang -> compose.onNodeWithTag("language-$lang").assertExists() }
        compose.onNodeWithTag("language-ar").performClick()
        compose.onNodeWithTag("theme-dark").performScrollTo().performClick()
        compose.onNodeWithTag("font-4").performScrollTo().performClick()
        compose.onNodeWithTag("closeSheet").performScrollTo().performClick()
        compose.onNodeWithTag("shelf").performClick()
        compose.onNodeWithTag("shelfScreen").assertIsDisplayed()
        compose.onNodeWithTag("create").performClick()
        compose.onNodeWithTag("worldPrompt").performTextInput("Native UI draft only — no generation")
        compose.onNodeWithTag("worldPrompt").assertTextContains("Native UI draft only — no generation")
    }
}
