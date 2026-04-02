import { redirect } from 'next/navigation'

export default function GroupSuggestionsRedirect() {
  redirect('/groups?tab=suggestions')
}
