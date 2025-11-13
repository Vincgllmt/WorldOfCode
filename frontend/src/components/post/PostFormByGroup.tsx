'use client'

import PostForm from './postForm'

export default function PostFormByGroup({ groupId }: { groupId: number }) {
  return <PostForm presetGroupId={groupId} showGroupSelector={false} submitLabel="Publier dans ce groupe" />
}
