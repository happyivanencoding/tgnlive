@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package com.thegreatnovel.tgnlive

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import androidx.core.net.toUri
import android.view.HapticFeedbackConstants
import androidx.activity.compose.BackHandler
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class Labels(context: Context, val language: String) {
    private val localized = context.createConfigurationContext(Configuration(context.resources.configuration).apply { setLocale(Locale.forLanguageTag(language)) })
    fun t(key: String, vararg values: Pair<String, Any>): String {
        val name = key.replace('.','_').map { c -> if(c in 'a'..'z' || c in '0'..'9' || c == '_') c.toString() else "u${c.code.toString(16)}" }.joinToString("")
        val id = NativeStringResources.ids[name] ?: 0
        var text = if(id != 0) localized.getString(id) else key.removePrefix("enum.")
        values.forEach { (key,value) -> text=text.replace("{$key}",value.toString()) }; return text
    }
    fun date(value: String): String = runCatching { DateTimeFormatter.ofPattern("MMM d · HH:mm",Locale.forLanguageTag(language)).withZone(ZoneId.systemDefault()).format(Instant.parse(value)) }.getOrDefault(value)
}
val LocalLabels = staticCompositionLocalOf<Labels> { error("Labels not provided") }
val LocalReaderPolicy = staticCompositionLocalOf { readerLayoutPolicy(800f,false,1f) }
val LocalSelectionFeedback = staticCompositionLocalOf<()->Unit> { {} }

@Composable fun LiveApp(vm: LiveViewModel) {
    val s by vm.state.collectAsStateWithLifecycle(); val context = LocalContext.current; val view=LocalView.current
    val labels = remember(s.settings.language,context) { Labels(context,s.settings.language) }
    val dark = s.settings.theme == "dark" || (s.settings.theme == "system" && isSystemInDarkTheme())
    val palette = if(dark) darkColorScheme(primaryContainer=Color(0xFF3B3427),onPrimaryContainer=Color(0xFFE4CAA0),secondaryContainer=Color(0xFF343A35),onSecondaryContainer=Color(0xFFDEDCCE),primary=Color(0xFFD0B17B),onPrimary=Color(0xFF2A241A),background=Color(0xFF171A1B),onBackground=Color(0xFFE8E1D3),surface=Color(0xFF1D2121),onSurface=Color(0xFFE8E1D3),surfaceVariant=Color(0xFF2B302E),onSurfaceVariant=Color(0xFFBEB9AF),outlineVariant=Color(0xFF414540)) else lightColorScheme(primaryContainer=Color(0xFFE9D8BB),onPrimaryContainer=Color(0xFF493720),secondaryContainer=Color(0xFFE8E2D3),onSecondaryContainer=Color(0xFF443F33),primary=Color(0xFF83612F),onPrimary=Color(0xFFFFF8EC),background=Color(0xFFF7F2E7),onBackground=Color(0xFF2B302D),surface=Color(0xFFFCF8EF),onSurface=Color(0xFF2B302D),surfaceVariant=Color(0xFFEDE7DB),onSurfaceVariant=Color(0xFF69695D),outlineVariant=Color(0xFFDCD5C5))
    val selection={ if(s.settings.haptics) view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); Unit }
    CompositionLocalProvider(LocalLabels provides labels, LocalSelectionFeedback provides selection, LocalLayoutDirection provides if(s.settings.language == "ar") LayoutDirection.Rtl else LayoutDirection.Ltr) {
        MaterialTheme(colorScheme=palette) {
            SideEffect {
                (context as? android.app.Activity)?.window?.let { window ->
                    androidx.core.view.WindowCompat.getInsetsController(window,window.decorView).apply { isAppearanceLightStatusBars=!dark; isAppearanceLightNavigationBars=!dark }
                }
            }
            Surface(Modifier.fillMaxSize().semantics { testTagsAsResourceId=true },color=palette.background) {
                BoxWithConstraints(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)).imePadding()) {
                  val density=LocalDensity.current
                  val policy=readerLayoutPolicy(maxHeight.value,WindowInsets.ime.getBottom(density)>0,density.fontScale)
                  CompositionLocalProvider(LocalReaderPolicy provides policy) {
                  Column(Modifier.fillMaxSize()) {
                    if(s.screen != "story" || !policy.hideHeader) Header(vm,s)
                    if((s.authNeeded || s.loginWaiting) && (s.screen != "story" || !policy.inlineAction)) LoginNotice(vm,s)
                    if(s.screen == "story") Box(Modifier.weight(1f)) { Story(vm,s) }
                    else {
                        if(!s.online && !s.loading) Notice(labels.t("native.offline"),labels.t("connection.retry")) { vm.refresh() }
                        s.error?.let { if(!s.authNeeded) Notice(labels.t(it),labels.t("common.retry")) { vm.refresh() } }
                        AnimatedContent(targetState=s.screen,modifier=Modifier.weight(1f),transitionSpec={ (fadeIn(tween(180))+slideInVertically(tween(180)) { it/40 }) togetherWith fadeOut(tween(120)) },label="screen") { screen ->
                            when(screen) { "create" -> Create(vm,s); "shelf" -> Shelf(vm,s); "preview" -> Preview(vm,s); else -> Discover(vm,s) }
                        }
                        if(s.screen != "preview") NavigationBar(containerColor=palette.background,windowInsets=WindowInsets.navigationBars) {
                            listOf("discover" to "◇","create" to "+","shelf" to "≡").forEach { (screen,mark) -> NavigationBarItem(selected=s.screen==screen,onClick={selection();vm.navigate(screen)},enabled=!s.busy,icon={Text(mark,fontSize=22.sp)},label={Text(labels.t("nav.$screen"))},modifier=Modifier.testTag(screen)) }
                        }
                    }
                  }
                  }
                }
                if(s.sheet != null) ModalBottomSheet(modifier=Modifier.semantics { testTagsAsResourceId=true },onDismissRequest={vm.sheet(null)},sheetState=rememberModalBottomSheetState(skipPartiallyExpanded=true),containerColor=palette.background) {
                    if(s.sheet == "state") NativeStateSpace(s.game) { vm.sheet(null) } else Column(Modifier.fillMaxWidth().heightIn(max=650.dp).verticalScroll(rememberScrollState()).padding(horizontal=24.dp).navigationBarsPadding()) {
                        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) { Text(labels.t(when(s.sheet) { "state" -> "sheet.status"; "choices" -> "actions.title"; else -> "native.settings" }),Modifier.weight(1f),style=MaterialTheme.typography.titleLarge); TextButton(onClick={vm.sheet(null)},Modifier.widthIn(max=110.dp).testTag("closeSheet")) { Text(labels.t("native.close")) } }
                        when(s.sheet) { "choices" -> SuggestionsSheet(vm,s); else -> Settings(vm,s) }
                        Spacer(Modifier.height(24.dp))
                    }
                }
                BackHandler(s.sheet != null || s.screen == "story" || s.screen == "preview") { if(s.sheet != null) vm.sheet(null) else if(!s.busy) { vm.navigate("shelf");vm.refresh() } }
            }
        }
    }
}

@Composable private fun Header(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current; val feedback=LocalSelectionFeedback.current
    Row(Modifier.fillMaxWidth().padding(horizontal=10.dp,vertical=4.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(6.dp)) {
        if(s.screen == "story" || s.screen == "preview") FilledTonalIconButton(onClick={feedback();vm.navigate("shelf");vm.refresh()},enabled=!s.busy,modifier=Modifier.testTag("leaveStory").semantics { contentDescription=t.t("story.leave") }) { ReadingChevron(back=true) }
        Column(Modifier.weight(1f).padding(start=4.dp)) {
            Text(if(s.screen == "story") s.game?.raw?.obj("world")?.str("title").orEmpty().ifBlank { s.game?.title ?: t.t("story.titleFallback") } else "TGN LIVE",fontFamily=FontFamily.Serif,fontSize=17.sp,maxLines=1,overflow=TextOverflow.Ellipsis)
            if(s.screen == "story") Text(s.game?.state?.str("location") ?: "",fontSize=11.sp,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=1,overflow=TextOverflow.Ellipsis)
        }
        if(s.screen == "story") OutlinedButton(onClick={feedback();vm.sheet("state")},shape=RoundedCornerShape(50),contentPadding=PaddingValues(horizontal=13.dp,vertical=7.dp),colors=ButtonDefaults.outlinedButtonColors(containerColor=MaterialTheme.colorScheme.surfaceVariant),border=BorderStroke(1.dp,MaterialTheme.colorScheme.primary.copy(alpha=.32f)),modifier=Modifier.heightIn(min=48.dp).testTag("state")) {
            Text("◈",Modifier.padding(end=5.dp),fontSize=14.sp); Text(t.t("actions.status"),fontSize=13.sp,maxLines=1)
        }
        FilledTonalIconButton(onClick={feedback();vm.sheet("settings")},modifier=Modifier.testTag("settings").semantics { contentDescription=t.t("native.settings") }) { Text("···",fontSize=24.sp,fontWeight=FontWeight.Bold) }
    }
    HorizontalDivider(color=MaterialTheme.colorScheme.outlineVariant.copy(alpha=.6f))
}

@Composable private fun LoginNotice(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current; val context=LocalContext.current
    Notice(t.t(if(s.loginWaiting) "native.loginWaiting" else "error.login"),t.t(if(s.loginWaiting) "native.cancel" else "native.login"),"login") {
        if(s.loginWaiting) vm.cancelLogin() else vm.login { url -> CustomTabsIntent.Builder().build().launchUrl(context,url.toUri()) }
    }
}
@Composable private fun Notice(text: String, action: String, tag: String = "reconnect", click: ()->Unit) {
    Surface(color=MaterialTheme.colorScheme.surfaceVariant) { FlowRow(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=4.dp),verticalArrangement=Arrangement.Center) { Text(text,Modifier.weight(1f).padding(vertical=10.dp),fontSize=13.sp); TextButton(onClick=click,modifier=Modifier.testTag(tag)) { Text(action) } } }
}
@Composable private fun QuietCard(title: String, subtitle: String, tag: String, onClick: ()->Unit, content: @Composable ColumnScope.()->Unit = {}) {
    val selection=LocalSelectionFeedback.current
    val interaction=remember { MutableInteractionSource() }; val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if(pressed) .985f else 1f,spring(stiffness=700f),label="press")
    Surface(onClick={selection();onClick()},interactionSource=interaction,modifier=Modifier.fillMaxWidth().graphicsLayer { scaleX=scale; scaleY=scale }.testTag(tag),shape=RoundedCornerShape(14.dp),color=MaterialTheme.colorScheme.surface,border=BorderStroke(1.dp,MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) { Text(title,fontFamily=FontFamily.Serif,fontSize=23.sp,lineHeight=30.sp); if(subtitle.isNotBlank()) Text(subtitle,fontSize=12.sp,color=MaterialTheme.colorScheme.primary); content() }
    }
}
@Composable private fun Discover(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current
    LazyColumn(Modifier.fillMaxSize().testTag("discoverScreen"),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        item { Text(t.t("discover.title"),fontSize=32.sp,lineHeight=41.sp,fontFamily=FontFamily.Serif,modifier=Modifier.padding(vertical=12.dp)) }
        s.shelf.firstOrNull()?.let { recent -> item { QuietCard(recent.str("title"),t.t("library.continue"),"continueRecent",{vm.open(recent.str("id"))}) { Text(t.t("library.turn","number" to recent.optInt("turnNumber")),fontSize=13.sp) } } }
        item { Text(t.t("worlds.note"),color=MaterialTheme.colorScheme.onSurfaceVariant,fontSize=14.sp) }
        if(s.loading && s.worlds.isEmpty()) item { Text(t.t("worlds.loading")) }
        items(s.worlds,key={it.id}) { world -> QuietCard(world.title,world.raw.str("sourceLabel"),"world-${world.id}",{vm.select(world)}) {
            Text(world.raw.str("subtitle"),style=MaterialTheme.typography.titleSmall)
            Text(world.raw.str("description"),fontSize=15.sp,lineHeight=24.sp,maxLines=3,overflow=TextOverflow.Ellipsis)
            Text(world.raw.obj("powerSystem").str("summary"),fontSize=12.sp,lineHeight=20.sp,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=2,overflow=TextOverflow.Ellipsis)
        } }
        item { TextButton(onClick={vm.navigate("create")},Modifier.testTag("createWorldEntry")) { Text(t.t("create.calloutTitle")) } }
    }
}
@Composable private fun Shelf(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current
    LazyColumn(Modifier.fillMaxSize().testTag("shelfScreen"),contentPadding=PaddingValues(18.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        item { Column(verticalArrangement=Arrangement.spacedBy(6.dp)) { Text(t.t("native.mybooks"),fontSize=30.sp,fontFamily=FontFamily.Serif); Text(t.t("native.bookcount","count" to s.shelf.size),fontSize=13.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) } }
        if(s.creationUncertain) item { Text(t.t("native.creationUnknown"),lineHeight=25.sp); OutlinedButton(onClick=vm::reviewedCreation,enabled=s.online && !s.loading,modifier=Modifier.testTag("creationReviewed")) { Text(t.t("native.creationReviewed")) } }
        if(s.shelf.isEmpty()) item { Text(t.t(if(s.loading) "shelf.loading" else "library.empty")) }
        items(s.shelf,key={it.str("id")}) { book -> NativeBookCard(book) { vm.open(book.str("id")) } }
    }
}
@Composable private fun Create(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp).testTag("createScreen"),verticalArrangement=Arrangement.spacedBy(20.dp)) {
        Text(t.t("create.title"),fontFamily=FontFamily.Serif,fontSize=30.sp,lineHeight=40.sp)
        Text(t.t("create.lede"),lineHeight=26.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(s.worldPrompt,vm::prompt,Modifier.fillMaxWidth().testTag("worldPrompt"),enabled=!s.busy,label={Text(t.t("create.promptLabel"))},minLines=5,maxLines=9,supportingText={Text("${s.worldPrompt.text.length} / 2000")})
        Button(onClick={vm.forge()},enabled=s.online && !s.busy && s.worldPrompt.text.isNotBlank(),modifier=Modifier.fillMaxWidth().testTag("forgeWorld")) { Text(t.t("create.generate")) }
        if(s.busy) { WaitingFeedback(t.t(s.stage)); OutlinedButton(onClick=vm::stop,modifier=Modifier.testTag("stopWorld")) { Text(t.t("create.stop")) } }
    }
}
@Composable private fun Preview(vm: LiveViewModel,s: LiveState) {
    val world=s.selectedWorld ?: return; val t=LocalLabels.current; val selection=LocalSelectionFeedback.current
    var name by rememberSaveable(world.id) { mutableStateOf("") }; var power by rememberSaveable(world.id) { mutableStateOf("") }; var adult by rememberSaveable(world.id) { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize().testTag("worldPreview").navigationBarsPadding(),contentPadding=PaddingValues(24.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        if(s.creationUncertain && !s.busy) item { Notice(t.t("native.creationUnknown"),t.t("native.inspectShelf"),"reviewCreatedGame") { vm.navigate("shelf"); vm.refresh() } }
        item { Text(world.title,fontFamily=FontFamily.Serif,fontSize=32.sp); Text(world.raw.str("sourceLabel"),color=MaterialTheme.colorScheme.primary,fontSize=12.sp) }
        item { Text(world.raw.str("description"),lineHeight=27.sp); Spacer(Modifier.height(12.dp)); Text(world.raw.obj("powerSystem").str("summary"),lineHeight=25.sp) }
        items(world.raw.obj("powerSystem").objects("realms")) { realm -> Text(listOf(realm.str("name"),realm.str("benchmark"),realm.str("unlock")).filter(String::isNotBlank).joinToString(" · "),fontSize=14.sp,lineHeight=23.sp) }
        item { Text(t.t("onboarding.power"),style=MaterialTheme.typography.titleMedium) }
        items(world.powers,key={it.str("id")}) { p -> Surface(onClick={selection();power=p.str("id")},shape=RoundedCornerShape(12.dp),border=BorderStroke(if(power == p.str("id")) 2.dp else 1.dp,if(power == p.str("id")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),modifier=Modifier.fillMaxWidth().testTag("power-${p.str("id")}")) {
            Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) { Text((if(power == p.str("id")) "✓ " else "")+p.str("name"),fontFamily=FontFamily.Serif,fontSize=20.sp); Text(p.str("description"),fontSize=15.sp,lineHeight=24.sp) }
        } }
        item { OutlinedTextField(name,{if(it.length <= 24) name=it},Modifier.fillMaxWidth().testTag("heroName"),label={Text(t.t("onboarding.name"))},singleLine=true) }
        item { Row(Modifier.fillMaxWidth().clickable { adult=!adult }.padding(vertical=8.dp),verticalAlignment=Alignment.CenterVertically) { Checkbox(adult,{adult=it},Modifier.testTag("adultConsent")); Text(t.t("onboarding.adult"),fontSize=13.sp,lineHeight=20.sp) } }
        item { Button(onClick={vm.createGame(name,power,adult,t.t("action.startStory"))},enabled=s.online && !s.busy && !s.creationUncertain && adult && name.trim().isNotBlank() && power.isNotBlank(),modifier=Modifier.fillMaxWidth().testTag("enterWorld")) { Text(t.t(if(s.busy) "onboarding.creating" else "onboarding.enter")) } }
    }
}

@Composable private fun Story(vm: LiveViewModel,s: LiveState) {
    val game=s.game; val t=LocalLabels.current
    if(game == null) { Column(Modifier.padding(24.dp)) { Text(t.t(if(s.loading) "shelf.loading" else "native.offline")); TextButton(onClick={vm.navigate("shelf")}) { Text(t.t("nav.shelf")) } }; return }
    key(game.id) {
        val anchorIndex = game.paragraphs.indexOfFirst { it.key == s.anchorKey }.takeIf { it >= 0 } ?: s.initialIndex
        val list=rememberLazyListState(anchorIndex.coerceIn(0,game.paragraphs.size.coerceAtLeast(1)-1),s.initialOffset)
        var viewport by remember { mutableStateOf<Rect?>(null) }
        val latestS by rememberUpdatedState(s)
        val nested=remember { object: NestedScrollConnection { override fun onPreScroll(available: Offset,source: NestedScrollSource): Offset { if(source == NestedScrollSource.UserInput && available.y > 0) vm.follow(false); return Offset.Zero } } }
        // Following is explicit. New text does not override a user's upward drag.
        LaunchedEffect(s.follow,s.preview,game.version,viewport?.height,s.busy) {
            if(s.follow) {
                // Measure the changed tail first, then make at most one non-animated move per frame.
                withFrameNanos { }
                val last=list.layoutInfo.totalItemsCount-1
                if(latestS.follow && last >= 0 && list.canScrollForward) list.scrollToItem(last)
            }
        }
        LaunchedEffect(list) { snapshotFlow { Triple(list.firstVisibleItemIndex,list.firstVisibleItemScrollOffset,list.layoutInfo.visibleItemsInfo.firstOrNull()?.key?.toString()) }.distinctUntilChanged().collect { (i,o,k) -> vm.anchor(i,o,k) } }
        Column(Modifier.fillMaxSize().testTag("story")) {
            if(!s.online && !s.busy && !LocalReaderPolicy.current.inlineAction) Notice(t.t("native.offline"),t.t("connection.retry")) { vm.resume() }
            Box(Modifier.weight(1f).fillMaxWidth()) {
                LazyColumn(state=list,modifier=Modifier.fillMaxSize().nestedScroll(nested).onGloballyPositioned { viewport=it.boundsInWindow() }.testTag("storyScroll"),contentPadding=PaddingValues(horizontal=24.dp,vertical=20.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(20.dp)) {
                    if(game.turns.isEmpty() && !s.busy) item("opening") { Text(t.t("turn.awaiting"),Modifier.widthIn(max=680.dp),lineHeight=28.sp) }
                    items(game.paragraphs,key={it.key},contentType={if(it.header) "header" else "paragraph"}) { p -> Prose(p,s,vm,viewport) }
                    if(s.busy && s.pending?.gameId == game.id && game.turns.none { it.index == vm.perf.turn }) {
                        item(headerKey(game.id,vm.perf.turn),contentType="header") { Prose(Paragraph(headerKey(game.id,vm.perf.turn),s.pending.action,s.pending.language,vm.perf.turn,true),s,vm,viewport) }
                        items(s.preview,key={it.key},contentType={"paragraph"}) { p -> Prose(p,s,vm,viewport) }
                    }
                    item("end") { Column(Modifier.widthIn(max=680.dp).fillMaxWidth()) {
                        if(s.busy && s.preview.isEmpty()) WaitingFeedback(t.t(s.stage),Modifier.testTag("worldResponding").frameProbe(vm,"feedbackFrame",s.sheet == null) { viewport })
                        else if(s.busy) { if(!s.narrativeEnded) Text(t.t("turn.provisional"),color=MaterialTheme.colorScheme.onSurfaceVariant,fontSize=11.sp) }
                        else if(s.growth) Text(t.t("native.growth"),color=MaterialTheme.colorScheme.primary,fontSize=14.sp,modifier=Modifier.frameProbe(vm,"growthVisibleFrame",s.sheet == null && game.id == vm.perf.gameId && vm.perf.acceptsFrames) { viewport })
                        else Text(t.t("story.unfinished"),fontFamily=FontFamily.Serif,color=MaterialTheme.colorScheme.onSurfaceVariant)
                    } }
                }
                if(!s.follow) FilledTonalButton(onClick={vm.follow(true)},modifier=Modifier.align(Alignment.BottomEnd).padding(12.dp).testTag("latest")) { Text(t.t("story.latest")) }
            }
            ActionDock(vm,s)
        }
    }
}

@Composable private fun Prose(p: Paragraph,s: LiveState,vm: LiveViewModel,viewport: Rect?) {
    val t=LocalLabels.current
    val direction=if(p.language == "ar") TextDirection.ContentOrRtl else TextDirection.ContentOrLtr
    val font=listOf(12,14,16,20,24)[s.settings.font].sp
    val current=!p.header && p.turn == vm.perf.turn && s.game?.id == vm.perf.gameId
    val timing=if(current) Modifier.frameProbe(vm,"firstVisibleNarrativeFrame",s.sheet == null && vm.perf.acceptsFrames) { viewport } else Modifier
    var glyph by remember(p.key) { mutableStateOf<Rect?>(null) }
    val last=if(s.busy) s.preview.lastOrNull()?.key == p.key else s.game?.paragraphs?.lastOrNull()?.key == p.key
    val count=if(s.busy) s.previewCharacters else s.game?.turns?.lastOrNull()?.narrative?.length ?: 0
    if(p.header) Column(Modifier.widthIn(max=680.dp).fillMaxWidth().padding(top=12.dp)) {
        Text(t.t("library.turn","number" to p.turn),fontSize=11.sp,color=MaterialTheme.colorScheme.primary)
        Text(p.text,style=TextStyle(fontSize=13.sp,lineHeight=21.sp,textDirection=direction),color=MaterialTheme.colorScheme.onSurfaceVariant)
    } else Text(p.text,modifier=Modifier.widthIn(max=680.dp).fillMaxWidth().then(timing)
        .tailProbe(vm,p.text,count,!s.busy,current && last && s.sheet == null,{viewport},{glyph})
        .testTag("paragraph-${p.key}"),
        onTextLayout={ result -> glyph=if(p.text.isNotEmpty()) result.getBoundingBox(p.text.lastIndex) else null },
        style=TextStyle(fontFamily=FontFamily.Serif,fontSize=font,lineHeight=font*1.85f,textDirection=direction))
}

/** Last glyph must actually intersect the reading viewport for two frames. Missing stays missing. */
@Composable private fun Modifier.tailProbe(vm: LiveViewModel,revision: String,characters: Int,canonical: Boolean,enabled: Boolean,viewport: ()->Rect?,glyph: ()->Rect?): Modifier {
    var coordinates by remember { mutableStateOf<LayoutCoordinates?>(null) }
    val areaNow by rememberUpdatedState(viewport); val glyphNow by rememberUpdatedState(glyph)
    val view=LocalView.current; val lifecycle=LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(enabled,revision,canonical,vm.perf.interactionId,coordinates) {
        if(!enabled || !vm.perf.acceptsFrames) return@LaunchedEffect
        var frames=0
        while(true) {
            withFrameNanos { }
            val c=coordinates; val area=areaNow(); val glyphRect=glyphNow()
            val visible=c != null && c.isAttached && area != null && glyphRect != null && lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED) && view.hasWindowFocus() && run {
                val origin=c.localToWindow(Offset.Zero)
                val actual=Rect(glyphRect.left+origin.x,glyphRect.top+origin.y,glyphRect.right+origin.x,glyphRect.bottom+origin.y)
                actual.top >= area.top && actual.bottom <= area.bottom && actual.overlaps(area)
            }
            frames=if(visible) frames+1 else 0
            if(frames>=2) { vm.perf.tailPaint(characters,canonical); break }
        }
    }
    return onGloballyPositioned { coordinates=it }
}

@Composable private fun ActionDock(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current; val view=LocalView.current; val game=s.game ?: return
    val policy=LocalReaderPolicy.current; val first=LocalSelectionFeedback.current
    val keyboard=LocalSoftwareKeyboardController.current; val focus=LocalFocusManager.current
    var expanded by rememberSaveable(game.id) { mutableStateOf(true) }
    val choices=game.turns.lastOrNull()?.choices ?: emptyList()
    var dockBounds by remember { mutableStateOf<Rect?>(null) }
    val ready=!s.busy && !s.loading && s.pending == null && s.online && game.id == vm.perf.gameId && game.turns.lastOrNull()?.index == vm.perf.turn
    LaunchedEffect(s.busy) { if(s.busy) { keyboard?.hide();focus.clearFocus() } }
    LaunchedEffect(s.error) { if(s.error in setOf("native.error","error.login","error.providerTimeout") && s.settings.haptics) view.performHapticFeedback(if(android.os.Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS) }
    Surface(shadowElevation=4.dp,shape=RoundedCornerShape(topStart=22.dp,topEnd=22.dp),color=MaterialTheme.colorScheme.background,modifier=Modifier.onGloballyPositioned { dockBounds=it.boundsInWindow() }.testTag("actionDock")) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal=16.dp,vertical=8.dp),horizontalAlignment=Alignment.CenterHorizontally) {
            Column(Modifier.widthIn(max=680.dp).fillMaxWidth()) {
                AnimatedVisibility(s.busy,enter=fadeIn(tween(130))+expandVertically(tween(210),expandFrom=Alignment.Bottom),exit=fadeOut(tween(100))+shrinkVertically(tween(180),shrinkTowards=Alignment.Bottom)) {
                    Column(Modifier.fillMaxWidth().testTag("pendingDock").frameProbe(vm,"feedbackFrame",s.busy && s.sheet == null) { dockBounds }) {
                        Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            Column(Modifier.weight(1f).padding(vertical=7.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                                if(s.narrativeEnded) WaitingFeedback(t.t(if(s.repairing) "native.waitrepair" else "native.waitconfirm"))
                                else Text(t.t(if(s.preview.isEmpty()) "native.submitted" else "native.continuing"),fontSize=13.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
                                if(s.narrativeEnded) Text(t.t("native.confirmhint"),fontSize=11.sp,lineHeight=16.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            OutlinedButton(onClick={first();vm.stop()},enabled=s.busy,contentPadding=PaddingValues(horizontal=12.dp,vertical=8.dp),modifier=Modifier.testTag("stopAction")) { Text(t.t(if(s.narrativeEnded) "native.cancelturn" else "turn.stop"),fontSize=12.sp) }
                        }
                    }
                }
                AnimatedVisibility(!s.busy || s.narrativeEnded,enter=fadeIn(tween(200))+expandVertically(tween(240),expandFrom=Alignment.Bottom)+slideInVertically(tween(240)) { it/5 },exit=fadeOut(tween(100))+shrinkVertically(tween(200),shrinkTowards=Alignment.Bottom)+slideOutVertically(tween(200)) { it/5 }) {
                    Column(Modifier.fillMaxWidth().testTag("readyDock")) {
                        if(!s.busy && !policy.hideToolbar) Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                            TextButton(onClick={first();if(policy.showSuggestions) expanded=!expanded else vm.sheet("choices")},modifier=Modifier.testTag("toggleSuggestions"),contentPadding=PaddingValues(horizontal=4.dp,vertical=0.dp)) { Text(t.t("actions.title")+if(expanded && policy.showSuggestions) " −" else " +",fontSize=12.sp) }
                            Spacer(Modifier.weight(1f))
                            if(ready) Text(t.t("native.turnready"),fontSize=12.sp,color=MaterialTheme.colorScheme.primary)
                        }
                        if(!s.busy && expanded && policy.showSuggestions) LazyRow(Modifier.fillMaxWidth().padding(bottom=8.dp),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            items(choices,key={it.str("id",it.str("label"))}) { choice ->
                                Surface(onClick={first();vm.suggest(choice.str("label"))},enabled=!s.busy && s.pending == null,shape=RoundedCornerShape(13.dp),color=MaterialTheme.colorScheme.surfaceVariant,border=BorderStroke(1.dp,MaterialTheme.colorScheme.outlineVariant),modifier=Modifier.width(218.dp).heightIn(min=76.dp).testTag("suggestion-${choice.str("id")}").frameProbe(vm,"choicesReady",ready && s.sheet == null) { dockBounds }) {
                                    Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) { Text(choice.str("label"),maxLines=3,overflow=TextOverflow.Ellipsis,fontSize=13.sp,lineHeight=20.sp); Text(t.t("native.choiceEdit"),fontSize=10.sp,color=MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                            }
                        }
                        if(s.error != null) Text(t.t(s.error),fontSize=12.sp,lineHeight=18.sp,color=MaterialTheme.colorScheme.error,modifier=Modifier.padding(bottom=5.dp))
                        OutlinedTextField(s.draft,vm::draft,modifier=Modifier.fillMaxWidth().testTag("actionInput").frameProbe(vm,"inputReady",ready && s.sheet == null) { dockBounds }.frameProbe(vm,"draftReady",s.busy && s.narrativeEnded && game.id == vm.perf.gameId && s.sheet == null) { dockBounds },enabled=true,textStyle=TextStyle(fontSize=16.sp,textDirection=if(s.settings.language == "ar") TextDirection.ContentOrRtl else TextDirection.ContentOrLtr),placeholder={Text(t.t(if(s.busy) "native.draftonly" else "actions.placeholder"),fontSize=15.sp)},minLines=1,maxLines=policy.maxInputLines,shape=RoundedCornerShape(16.dp),trailingIcon={ DockAction(vm,s,true,dockBounds) })
                    }
                }
            }
        }
    }
}

@Composable private fun SuggestionsSheet(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current; val selection=LocalSelectionFeedback.current
    Text(t.t("native.choiceEdit"),fontSize=13.sp,modifier=Modifier.padding(vertical=12.dp))
    s.game?.turns?.lastOrNull()?.choices?.forEach { choice ->
        OutlinedButton(onClick={selection();vm.suggest(choice.str("label"));vm.sheet(null)},enabled=!s.busy,modifier=Modifier.fillMaxWidth().padding(vertical=6.dp).testTag("suggestion-${choice.str("id")}"),shape=RoundedCornerShape(12.dp)) { Text(choice.str("label"),fontSize=16.sp,lineHeight=25.sp,modifier=Modifier.padding(vertical=8.dp)) }
    }
}

@Composable private fun DockAction(vm: LiveViewModel,s: LiveState,inline: Boolean,bounds: Rect?) {
    val t=LocalLabels.current; val view=LocalView.current
    val retry=!s.busy && s.pending?.gameId == s.game?.id
    val tag=if(s.busy) "retiringAction" else if(retry) "retryAction" else "sendAction"
    val label=t.t(if(s.busy) "native.draftonly" else if(retry) "actions.retry" else "actions.submit")
    val enabled=!s.busy && (if(retry) !s.loading else s.online && !s.loading && s.draft.text.isNotBlank())
    val click={
        if(s.settings.haptics) view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        if(s.busy) vm.stop() else vm.send(retry)
    }
    val modifier=Modifier.testTag(tag).frameProbe(vm,"feedbackFrame",s.busy && s.sheet == null) { bounds }
    if(inline && retry) FilledTonalButton(onClick=click,enabled=enabled,modifier=modifier.heightIn(min=48.dp),contentPadding=PaddingValues(horizontal=10.dp)) { Text(label,fontSize=12.sp) }
    else if(inline) FilledIconButton(onClick=click,enabled=enabled,modifier=modifier.sizeIn(minWidth=48.dp,minHeight=48.dp).semantics { contentDescription=label }) { Text(if(retry) "↻" else "↑",fontSize=22.sp) }
    else Button(onClick=click,enabled=enabled,modifier=modifier) { Text(label) }
}

/** Two consecutive intersecting frames; offscreen composition is never counted as visible. */
@Composable private fun Modifier.frameProbe(vm: LiveViewModel,event: String,enabled: Boolean,viewport: ()->Rect?): Modifier {
    var coordinates by remember { mutableStateOf<LayoutCoordinates?>(null) }
    val currentViewport by rememberUpdatedState(viewport); val lifecycle=LocalLifecycleOwner.current.lifecycle; val view=LocalView.current
    LaunchedEffect(enabled,vm.perf.interactionId,coordinates) {
        if(!enabled) return@LaunchedEffect
        var frames=0
        while(true) {
            withFrameNanos { }
            val c=coordinates; val area=currentViewport()
            val visible=c != null && c.isAttached && area != null && lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED) && view.hasWindowFocus() && c.boundsInWindow().let { it.width > 0 && it.height >= (if(event in setOf("draftReady","inputReady")) 44*view.resources.displayMetrics.density else 1f) && it.overlaps(area) }
            frames=if(visible) frames+1 else 0
            if(frames >= 2) {
                val marked=vm.perf.mark(event)
                if(marked && vm.state.value.settings.haptics) when(event) { "draftReady","inputReady" -> if(vm.perf.mark("controlReturned")) view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); "firstVisibleNarrativeFrame" -> view.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK); "growthVisibleFrame" -> view.performHapticFeedback(if(android.os.Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.LONG_PRESS) }
                break
            }
        }
    }
    return onGloballyPositioned { coordinates=it }
}

@Composable private fun Settings(vm: LiveViewModel,s: LiveState) {
    val t=LocalLabels.current; val context=LocalContext.current; val setting=s.settings; val selection=LocalSelectionFeedback.current
    Text(t.t("language.label"),Modifier.padding(top=20.dp))
    FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) { listOf("zh" to "中文","en" to "English","fr" to "Français","es" to "Español","ar" to "العربية").forEach { (code,label) -> FilterChip(selected=setting.language==code,onClick={selection();vm.settings(setting.copy(language=code))},enabled=!s.busy,label={Text(label)},modifier=Modifier.testTag("language-$code")) } }
    Text(t.t("reading.background"),Modifier.padding(top=20.dp))
    FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) { listOf("light","dark","system").forEach { mode -> FilterChip(selected=setting.theme==mode,onClick={selection();vm.settings(setting.copy(theme=mode))},label={Text(t.t("reading.$mode"))},modifier=Modifier.testTag("theme-$mode")) } }
    Text(t.t("reading.font"),Modifier.padding(top=20.dp))
    FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) { (0..4).forEach { index -> FilterChip(selected=setting.font==index,onClick={selection();vm.settings(setting.copy(font=index))},label={Text(t.t("native.font$index"))},modifier=Modifier.testTag("font-$index").semantics { contentDescription=t.t("reading.font")+": "+t.t("native.font$index") }) } }
    Row(Modifier.fillMaxWidth().padding(vertical=12.dp),verticalAlignment=Alignment.CenterVertically) { Text(t.t("native.haptics"),Modifier.weight(1f)); Switch(setting.haptics,{vm.settings(setting.copy(haptics=it))},modifier=Modifier.testTag("haptics")) }
    if(BuildConfig.DEBUG) { Text(t.t("native.timingNote"),fontSize=12.sp,lineHeight=18.sp); TextButton(onClick={ context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,vm.perf.export()),t.t("native.export"))) },modifier=Modifier.testTag("exportTimings")) { Text(t.t("native.export")) } }
    TextButton(onClick={vm.logout()},modifier=Modifier.testTag("logout")) { Text(t.t("native.logout")) }
}
