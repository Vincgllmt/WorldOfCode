<?php

namespace App\Controller;

use App\Entity\Post;
use App\Repository\PostRepository;
use App\Repository\TechGroupRepository;
use App\Dto\PostResponse;
use App\Mapper\PostMapper;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Mapper\CommentMapper;
use App\Dto\CommentResponse;

#[Route('/api/post')]
#[OA\Tag(name: 'Post')]
class PostController extends AbstractController
{
    public function __construct(
        private PostRepository $repo,
        private TechGroupRepository $groupRepo,
        private PostMapper $mapper
    ) {}

    #[Route('', name: 'post_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les posts',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des posts',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: PostResponse::class))
                )
            )
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $posts = $this->repo->findAll();
        $data = array_map([$this->mapper, 'toDto'], $posts);

        return $this->json($data);
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'post_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Détail d\'un post',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Post trouvé',
                content: new Model(type: PostResponse::class)
            ),
            new OA\Response(response: 404, description: 'Post non trouvé')
        ]
    )]
    public function get(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $post = $this->repo->find($id);

        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        return $this->json($this->mapper->toDto($post));
    }
    ####
    ##
    ####
    #[Route('', name: 'post_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un post',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'groupId', type: 'integer')
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Post créé', content: new Model(type: PostResponse::class)),
            new OA\Response(response: 400, description: 'Erreur de validation'),
            new OA\Response(response: 403, description: 'Non autorisé'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;
        $groupId = $data['groupId'] ?? null;

        if (!$content || !$groupId) {
            return $this->json(['error' => 'Missing content or groupId'], 400);
        }

        $group = $this->groupRepo->find($groupId);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $post = new Post();
        $post->setContent($content);
        $post->setAuthor($this->getUser());
        $post->setTechGroup($group);

        $this->repo->save($post, true);

        return $this->json($this->mapper->toDto($post), 201);
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'post_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un post',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Post supprimé'),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Post non trouvé')
        ]
    )]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $post = $this->repo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $currentUser = $this->getUser();
        if ($post->getAuthor() !== $currentUser && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $this->repo->remove($post, true);

        return $this->json(['success' => true]);
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'post_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met à jour un post',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'content', type: 'string'),
                    new OA\Property(property: 'groupId', type: 'integer', nullable: true)
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Post mis à jour', content: new Model(type: PostResponse::class)),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Post non trouvé'),
        ]
    )]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $post = $this->repo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $currentUser = $this->getUser();
        if ($post->getAuthor() !== $currentUser && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;
        $groupId = $data['groupId'] ?? null;

        if ($content) {
            $post->setContent($content);
        }

        if ($groupId) {
            $group = $this->groupRepo->find($groupId);
            if (!$group) {
                return $this->json(['error' => 'Group not found'], 404);
            }
            $post->setTechGroup($group);
        }

        $this->repo->save($post, true);

        return $this->json($this->mapper->toDto($post));
    }
    ####
    ##
    ####
    #[Route('/{id}/comment', name: 'post_comments', methods: ['GET'])]
    #[OA\Get(
        summary: 'Commentaires associés à un post',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des commentaires',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: CommentResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Post non trouvé')
        ]
    )]
    public function listComments(int $id, CommentMapper $commentMapper): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $post = $this->repo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $comments = $post->getComments();
        $data = array_map(fn($comment) => $commentMapper->toDto($comment), $comments->toArray());

        return $this->json($data);
    }

    #[Route('/{id}/share', name: 'post_share', methods: ['POST'])]
    #[OA\Post(
        summary: 'Partager un post existant',
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'content', type: 'string', nullable: true),
                    new OA\Property(property: 'groupId', type: 'integer', nullable: true)
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 201, description: 'Post partagé', content: new Model(type: PostResponse::class)),
            new OA\Response(response: 404, description: 'Post non trouvé')
        ]
    )]
    public function share(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $original = $this->repo->find($id);
        if (!$original) {
            return $this->json(['error' => 'Original post not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;
        $groupId = $data['groupId'] ?? null;

        $group = null;
        if ($groupId) {
            $group = $this->groupRepo->find($groupId);
            if (!$group) {
                return $this->json(['error' => 'Group not found'], 404);
            }
        } else {
            $group = $original->getTechGroup(); // défaut : même groupe que l’original
        }

        $post = new Post();
        $post->setAuthor($this->getUser());
        $post->setContent($content ?? '');
        $post->setSharedFrom($original);
        $post->setTechGroup($group);

        $this->repo->save($post, true);

        return $this->json($this->mapper->toDto($post), 201);
    }
}
