package com.purpleiptv.tv.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.foundation.lazy.list.rememberTvLazyListState
import com.purpleiptv.tv.theme.PurpleSpacing

/**
 * The TV equivalent of a Netflix-style horizontal row.
 *
 * Built on `TvLazyRow` which gives us native D-pad scrolling, smooth
 * "snap to focus" behaviour, and accessibility for free.
 *
 * The `header` slot renders the all-caps eyebrow ("CONTINUE WATCHING").
 *
 * Each row tracks whether *any* of its items is focused, and passes that
 * down so cards can dim their siblings. We do this by lifting focus
 * state via `onFocusChanged` — the inner cards' interaction-source
 * focus stays local but their visual dim does not.
 */
@Composable
fun <T> ContentRow(
    title: String,
    items: List<T>,
    modifier: Modifier = Modifier,
    leftPadding: androidx.compose.ui.unit.Dp = PurpleSpacing.TvSafeX,
    itemSpacing: androidx.compose.ui.unit.Dp = 24.dp,
    headerColor: androidx.compose.ui.graphics.Color = com.purpleiptv.tv.theme.PurplePalette.Fg3,
    content: @Composable (item: T, index: Int, isAnySiblingFocused: Boolean) -> Unit,
) {
    var focusedIndex by remember { mutableStateOf<Int?>(null) }
    val state = rememberTvLazyListState()

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        CapsLabel(
            text = title,
            color = if (focusedIndex != null) com.purpleiptv.tv.theme.PurplePalette.Purple300 else headerColor,
            modifier = Modifier.padding(start = leftPadding),
        )
        TvLazyRow(
            state = state,
            horizontalArrangement = Arrangement.spacedBy(itemSpacing),
            contentPadding = PaddingValues(start = leftPadding, end = leftPadding),
        ) {
            itemsIndexed(items, key = { i, _ -> i }) { index, item ->
                Box(
                    modifier = Modifier.onFocusedChildChanged { focused ->
                        focusedIndex = if (focused) index else if (focusedIndex == index) null else focusedIndex
                    },
                ) {
                    content(item, index, focusedIndex != null && focusedIndex != index)
                }
            }
        }
    }
}

/** Tiny helper: fires when any descendant gains/loses focus. */
@Composable
private fun Modifier.onFocusedChildChanged(onChange: (Boolean) -> Unit): Modifier =
    this.then(
        androidx.compose.ui.Modifier.onFocusEvent { state ->
            onChange(state.hasFocus)
        },
    )

@Composable
private fun androidx.compose.ui.Modifier.onFocusEvent(
    onFocusEvent: (androidx.compose.ui.focus.FocusState) -> Unit,
): androidx.compose.ui.Modifier =
    this.then(androidx.compose.ui.focus.onFocusEvent { onFocusEvent(it) })
