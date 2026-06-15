<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Repository\CommentRepository;
use App\Repository\PostRepository;
use App\Mapper\CommentMapper;
use App\Dto\CommentResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Service\NotificationService;
use App\Service\Moderation\TextModerationService;
use App\Service\Moderation\ContentRejectedException;
use App\Enum\NotificationType;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerInterface;

#[Route('/api/comment')]
#[OA\Tag(name: 'Comment')]
class CommentController extends AbstractController
{
    public function __construct(
        private CommentRepository $repo,
        private PostRepository $postRepo,
        private CommentMapper $mapper,
        private NotificationService $notificationService,
        private TextModerationService $moderation,
        private HtmlSanitizerInterface $appUserContent
    ) {}

    #[Route('', name: 'comment_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les commentaires',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des commentaires',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: new Model(type: CommentResponse::class)))
            )
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $comments = $this->repo->findAll();
        $data = array_map([$this->mapper, 'toDto'], $comments);

        return $this->json($data);
    }
    #[Route('/{id}', name: 'comment_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Détail d\'un commentaire',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Commentaire trouvé', content: new Model(type: CommentResponse::class)),
            new OA\Response(response: 404, description: 'Commentaire non trouvé')
        ]
    )]
    public function get(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $comment = $this->repo->find($id);
        if (!$comment) {
            return $this->json(['error' => 'Comment not found'], 404);
        }

        return $this->json($this->mapper->toDto($comment));
    }
    #[Route('', name: 'comment_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un commentaire',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'content', type: 'string'),
                new OA\Property(property: 'postId', type: 'integer')
            ], type: 'object')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Commentaire créé', content: new Model(type: CommentResponse::class)),
            new OA\Response(response: 400, description: 'Requête invalide'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;
        $postId = $data['postId'] ?? null;

        if (!$content || !$postId) {
            return $this->json(['error' => 'Missing content or postId'], 400);
        }

        // SEC-21 : sanitization HTML avant persistance (défense en profondeur)
        $content = $this->appUserContent->sanitize($content);

        // Modération du contenu du commentaire
        try {
            $this->moderation->checkOrThrow($content);
        } catch (ContentRejectedException $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'code' => 'content_rejected',
            ], 422);
        }

        $post = $this->postRepo->find($postId);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $comment = new Comment();
        $comment->setContent($content);
        $comment->setPost($post);
        $comment->setAuthor($this->getUser());

        $this->repo->save($comment, true);

        // Notifier l'auteur du post
        $this->notificationService->createAndPush(
            $post->getAuthor(),
            $this->getUser(),
            NotificationType::COMMENT,
            $this->getUser()->getUsername() . ' a commenté votre post',
            $post->getId()
        );

        return $this->json($this->mapper->toDto($comment), 201);
    }
    #[Route('/{id}', name: 'comment_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met à jour un commentaire',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'content', type: 'string')
            ], type: 'object')
        ),
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Commentaire mis à jour', content: new Model(type: CommentResponse::class)),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Commentaire non trouvé')
        ]
    )]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $comment = $this->repo->find($id);
        if (!$comment) {
            return $this->json(['error' => 'Comment not found'], 404);
        }

        $currentUser = $this->getUser();
        if ($comment->getAuthor() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;

        if ($content) {
            // SEC-21 : sanitization HTML avant persistance
            $content = $this->appUserContent->sanitize($content);
            // Modération avant écrasement
            try {
                $this->moderation->checkOrThrow($content);
            } catch (ContentRejectedException $e) {
                return $this->json([
                    'error' => $e->getMessage(),
                    'code' => 'content_rejected',
                ], 422);
            }
            $comment->setContent($content);
            $this->repo->save($comment, true);
        }

        return $this->json($this->mapper->toDto($comment));
    }
    #[Route('/{id}', name: 'comment_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un commentaire',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Commentaire supprimé'),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Commentaire non trouvé')
        ]
    )]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $comment = $this->repo->find($id);
        if (!$comment) {
            return $this->json(['error' => 'Comment not found'], 404);
        }

        $currentUser = $this->getUser();
        if ($comment->getAuthor() !== $currentUser && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $this->repo->remove($comment, true);

        return $this->json(['success' => true]);
    }
}
