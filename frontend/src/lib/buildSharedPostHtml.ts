import type { Post } from '@/interfaces/post'

// Icône Users SVG inline (lucide)
const usersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:3px;opacity:0.7;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`

// Icône External Link SVG inline
const linkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`

export function buildSharedPostHtml(post: Post, personalMessage?: string): string {
    // Extraire le texte brut du contenu HTML du post
    let plainContent = post.content ?? ''
    if (typeof document !== 'undefined' && post.content) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = post.content
        plainContent = tempDiv.textContent || tempDiv.innerText || ''
    }

    const excerpt =
        plainContent.length > 150
            ? plainContent.slice(0, 150) + '…'
            : plainContent

    const postUrl = `/post/${post.id}`
    const initials = post.authorUsername.slice(0, 2).toUpperCase()

    // Message perso intégré DANS la carte
    const personalHtml = personalMessage?.trim()
        ? `<p class="shared-post-personal">${personalMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
        : ''

    return `<div class="shared-post-card"><div class="shared-post-accent"></div><div class="shared-post-body">${personalHtml}<div class="shared-post-header"><span class="shared-post-avatar">${initials}</span><div class="shared-post-meta"><p class="shared-post-author">${post.authorUsername}</p><p class="shared-post-group">${usersIcon}${post.techGroupName}</p></div></div>${excerpt ? `<p class="shared-post-excerpt">${excerpt}</p>` : ''}<a href="${postUrl}" class="shared-post-link">${linkIcon} Voir la publication</a></div></div>`
}
