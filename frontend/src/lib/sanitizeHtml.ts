'use client'

import DOMPurify from 'dompurify'

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['class'],
  })
