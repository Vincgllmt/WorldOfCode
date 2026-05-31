package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import com.purple.iptvplayer.core.data.DownloadRepository
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import kotlinx.coroutines.flow.StateFlow

class DownloadViewModel(private val repo: DownloadRepository) : ViewModel() {

    /** Live list of all downloads (queued, active, completed, failed). */
    val downloads: StateFlow<List<DownloadItem>> = repo.items

    fun enqueue(item: DownloadItem)           = repo.enqueue(item)
    fun enqueueAll(items: List<DownloadItem>) = repo.enqueueAll(items)
    fun remove(id: String)                    = repo.remove(id)
    fun removeAll(ids: List<String>)          = repo.removeAll(ids)
    fun retry(id: String)                     = repo.retry(id)

    fun statusOf(id: String): DownloadStatus? = repo.statusOf(id)
    fun itemOf(id: String): DownloadItem?     = repo.itemOf(id)
}
