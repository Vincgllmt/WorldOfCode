export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export const ALLOWED_AVATAR_TYPES = [...ALLOWED_IMAGE_TYPES, 'image/svg+xml']

export const ALLOWED_FILE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
]

export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
