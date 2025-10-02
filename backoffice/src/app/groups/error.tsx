'use client'
export default function Error({ error }: { error: Error }) {
  return <div className="text-destructive">Une erreur est survenue : {error.message}</div>
}
