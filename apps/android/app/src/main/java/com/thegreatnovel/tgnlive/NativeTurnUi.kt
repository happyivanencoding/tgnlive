@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package com.thegreatnovel.tgnlive

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import org.json.JSONObject

/** Small, continuous pre-narrative signal. No percentage, hidden reasoning or fake milestones. */
@Composable internal fun WaitingFeedback(text: String, modifier: Modifier = Modifier) {
    val transition=rememberInfiniteTransition(label="world-breath")
    val breath by transition.animateFloat(.30f,.90f,infiniteRepeatable(tween(1250,easing=FastOutSlowInEasing),RepeatMode.Reverse),label="breath")
    val accent=MaterialTheme.colorScheme.primary
    Row(modifier,verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)) {
        Canvas(Modifier.size(26.dp,14.dp).testTag("waitingMotion")) {
            repeat(3) { index ->
                val strength=(breath-(index*.14f)).coerceIn(.18f,.9f)
                drawCircle(accent.copy(alpha=strength),radius=(2.1f+strength*.35f).dp.toPx(),center=Offset((4+index*9).dp.toPx(),size.height/2))
            }
        }
        Text(text,fontSize=12.sp,lineHeight=18.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable internal fun ReadingChevron(modifier: Modifier = Modifier, back: Boolean = false) {
    val color=LocalContentColor.current
    val rtl=LocalLayoutDirection.current == LayoutDirection.Rtl
    Canvas(modifier.size(20.dp)) {
        val right=if(back) rtl else !rtl
        val tip=if(right) .68f else .32f
        val base=if(right) .36f else .64f
        drawLine(color,Offset(size.width*base,size.height*.25f),Offset(size.width*tip,size.height*.5f),2.dp.toPx(),StrokeCap.Round)
        drawLine(color,Offset(size.width*tip,size.height*.5f),Offset(size.width*base,size.height*.75f),2.dp.toPx(),StrokeCap.Round)
    }
}

@Composable internal fun NativeBookCard(book: JSONObject, onOpen: () -> Unit) {
    val t=LocalLabels.current; val feedback=LocalSelectionFeedback.current
    val shape=RoundedCornerShape(18.dp)
    Surface(onClick={feedback();onOpen()},shape=shape,modifier=Modifier.fillMaxWidth().testTag("game-${book.str("id")}"),
        color=MaterialTheme.colorScheme.surface,tonalElevation=1.dp,shadowElevation=1.dp,border=BorderStroke(1.dp,MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
            Surface(Modifier.width(5.dp).fillMaxHeight(),color=MaterialTheme.colorScheme.primary.copy(alpha=.55f)) {}
            Column(Modifier.weight(1f).padding(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment=Alignment.Top) {
                    Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                        Text(book.str("title"),fontFamily=FontFamily.Serif,fontSize=22.sp,lineHeight=30.sp,fontWeight=FontWeight.Medium)
                        book.str("worldTitle").takeIf(String::isNotBlank)?.let { Text(it,fontSize=12.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    ReadingChevron(Modifier.padding(start=10.dp,top=5.dp))
                }
                FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                    Text(book.str("name"),fontSize=14.sp,fontWeight=FontWeight.Medium)
                    book.obj("realm").str("name").takeIf(String::isNotBlank)?.let { realm ->
                        Surface(shape=CircleShape,color=MaterialTheme.colorScheme.surfaceVariant) { Text(realm,Modifier.padding(horizontal=10.dp,vertical=3.dp),fontSize=12.sp) }
                    }
                }
                book.str("goal").takeIf(String::isNotBlank)?.let { Text(it,fontSize=13.sp,lineHeight=21.sp,maxLines=2,overflow=TextOverflow.Ellipsis,color=MaterialTheme.colorScheme.onSurfaceVariant) }
                Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                    Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(3.dp)) {
                        Text(t.t("library.turn","number" to book.optInt("turnNumber")),fontSize=12.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(t.date(book.str("updatedAt")),fontSize=11.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    // The whole card is the target. This capsule makes its action legible without nested clicks.
                    Surface(shape=CircleShape,color=MaterialTheme.colorScheme.primaryContainer) {
                        Row(Modifier.padding(horizontal=13.dp,vertical=9.dp),verticalAlignment=Alignment.CenterVertically) {
                            Text(t.t("library.continue"),fontSize=12.sp,color=MaterialTheme.colorScheme.onPrimaryContainer)
                            ReadingChevron(Modifier.size(15.dp))
                        }
                    }
                }
            }
        }
    }
}

private data class StateEntry(val title: String, val body: String, val detail: String = "")

/** Six native tabs, one authoritative game snapshot. This is presentation, not a second state model. */
@Composable internal fun NativeStateSpace(game: Game?, close: () -> Unit) {
    val t=LocalLabels.current; val select=LocalSelectionFeedback.current
    var tab by rememberSaveable(game?.id) { mutableIntStateOf(0) }
    val state=game?.state ?: JSONObject(); val progression=state.obj("progression")
    val tabs=listOf("native.charactertab","native.abilitiestab","native.itemstab","native.peopletab","native.leveragetab","native.opportunitiestab")
    Column(Modifier.fillMaxWidth().fillMaxHeight(.9f).navigationBarsPadding().testTag("stateSpace")) {
        Row(Modifier.fillMaxWidth().padding(horizontal=20.dp),verticalAlignment=Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(game?.raw?.str("name").orEmpty(),fontFamily=FontFamily.Serif,fontSize=25.sp)
                Text(game?.raw?.obj("world")?.str("title").orEmpty(),fontSize=12.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
            }
            FilledTonalButton(onClick=close,modifier=Modifier.testTag("closeSheet"),contentPadding=PaddingValues(horizontal=16.dp,vertical=8.dp)) { Text(t.t("native.close")) }
        }
        BoxWithConstraints(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=10.dp).testTag("stateTabs")) {
            val columns=if(maxWidth>600.dp) 6 else 3
            Column(verticalArrangement=Arrangement.spacedBy(4.dp)) {
                tabs.indices.chunked(columns).forEach { row ->
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                        row.forEach { index ->
                            FilterChip(selected=tab==index,onClick={select();tab=index},
                                label={ Text(t.t(tabs[index]),fontSize=13.sp,maxLines=2,overflow=TextOverflow.Ellipsis) },
                                modifier=Modifier.weight(1f).heightIn(min=48.dp).testTag("stateTab-$index"))
                        }
                    }
                }
            }
        }
        HorizontalDivider(Modifier.padding(horizontal=20.dp),color=MaterialTheme.colorScheme.outlineVariant)
        AnimatedContent(targetState=tab,modifier=Modifier.weight(1f),transitionSpec={fadeIn(tween(160)) togetherWith fadeOut(tween(110))},label="state-section") { page ->
            val entries=remember(game,page,t.language) { when(page) {
                0 -> {
                    val realm=state.obj("realm")
                    val next=game?.raw?.obj("world")?.obj("powerSystem")?.objects("realms")?.firstOrNull { it.optInt("rank",-1)==realm.optInt("rank")+1 }
                    listOf(StateEntry(realm.str("name"),realm.str("benchmark"),realm.str("unlock")),
                        StateEntry(t.t("status.location"),state.str("location")),StateEntry(t.t("status.goal"),state.str("goal"))) +
                        if(next != null) listOf(StateEntry(t.t("native.nextrealm")+" · "+next.str("name"),next.str("benchmark"),next.str("unlock"))) else emptyList()
                }
                1 -> {
                    val power=state.obj("power"); val skills=state.objects("capabilities")
                    val explicit=skills.any { it.str("id")=="power-${power.str("id")}" || it.str("name")==power.str("name") }
                    (if(explicit || power.length()==0) emptyList() else listOf(StateEntry(power.str("name"),power.str("description")))) + skills.map { StateEntry(it.str("name"),it.str("description")) }
                }
                2 -> (if(state.has("coins")) listOf(StateEntry(state.str("currencyName").ifBlank { t.t("status.currency") },state.opt("coins").toString())) else emptyList()) +
                    state.objects("inventory").map { StateEntry(it.str("name")+(if(it.has("qty")) " × ${it.opt("qty")}" else ""),it.str("description")) }
                3 -> state.objects("relationships").map { StateEntry(it.str("name"),it.str("role"),t.t("enum.${it.str("attitude")}")) }
                4 -> progression.objects("leverage").filter { it.str("status")=="active" }.map { StateEntry(it.str("name"),it.str("effect"),listOf(it.str("scope"),if(it.optInt("useCount")>0) t.t("status.reused","count" to it.optInt("useCount")) else "").filter(String::isNotBlank).joinToString("\n")) }
                else -> progression.objects("opportunities").filter { it.str("status")=="open" }.map { StateEntry(it.str("name"),it.str("payoff"),it.str("approach")) } +
                    progression.objects("opportunities").filter { it.str("status")=="fulfilled" }.takeLast(3).map { StateEntry(t.t("status.fulfilled")+" · "+it.str("name"),it.str("result")) }
            }.filter { it.title.isNotBlank() || it.body.isNotBlank() } }
            LazyColumn(Modifier.fillMaxSize().testTag("statePage-$page"),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                if(entries.isEmpty()) item { Text(t.t("native.stateempty"),lineHeight=26.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) }
                items(entries) { entry ->
                    Surface(shape=RoundedCornerShape(15.dp),color=MaterialTheme.colorScheme.surface,border=BorderStroke(1.dp,MaterialTheme.colorScheme.outlineVariant),modifier=Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                            Text(entry.title,fontFamily=if(page==0) FontFamily.Serif else FontFamily.Default,fontSize=if(page==0) 22.sp else 18.sp,lineHeight=28.sp,color=MaterialTheme.colorScheme.primary)
                            if(entry.body.isNotBlank()) Text(entry.body,fontSize=16.sp,lineHeight=27.sp)
                            if(entry.detail.isNotBlank()) { HorizontalDivider(color=MaterialTheme.colorScheme.outlineVariant); Text(entry.detail,fontSize=14.sp,lineHeight=24.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                }
            }
        }
    }
}
