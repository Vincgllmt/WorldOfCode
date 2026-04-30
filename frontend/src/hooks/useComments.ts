import { createComment, deleteComment, getAllComments, updateComment } from "@/services/commentService"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"


export const useComments = () => {
  const { data: comments, isLoading, error } = useQuery({
    queryKey: ['comments'],
    queryFn: getAllComments
  })

  return { comments, isLoading, error }
}

export const useCreateComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
    onError: (err: Error) =>
      toast.error(err?.message || 'Erreur lors de la création du commentaire'),
  })
}

export const useDeleteComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
    onError: (err: Error) =>
      toast.error(err?.message || 'Erreur lors de la suppression du commentaire'),
  })
}

export const useUpdateComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
    onError: (err: Error) =>
      toast.error(err?.message || 'Erreur lors de la mise à jour du commentaire'),
  })
}
