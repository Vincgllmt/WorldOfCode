<?php

namespace App\Controller;

use App\Dto\ProfileHighlightResponse;
use App\Entity\ProfileHighlight;
use App\Enum\Visibility;
use App\Repository\MentorProfileRepository;
use App\Repository\PostRepository;
use App\Repository\ProfileHighlightRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[OA\Tag(name: 'ProfileHighlight')]
final class ProfileHighlightController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ProfileHighlightRepository $highlightRepo,
        private PostRepository $postRepo,
        private UserRepository $userRepo,
        private MentorProfileRepository $mentorProfileRepo
    ) {}

    #[Route('api/posts/{id}/pin-to-profile', name: 'highlight_pin', methods: ['POST'])]
    #[OA\Post(
        summary: 'Epingle un post en Temps fort sur le profil',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 201, description: 'Post epingle'),
            new OA\Response(response: 403, description: 'Acces interdit — non auteur du post'),
            new OA\Response(response: 404, description: 'Post non trouve'),
            new OA\Response(response: 409, description: 'Limite de 3 posts epingles atteinte ou post deja epingle')
        ]
    )]
    public function pin(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $post = $this->postRepo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        if ($post->getAuthor() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $existing = $this->highlightRepo->findOneBy(['user' => $currentUser, 'post' => $post]);
        if ($existing) {
            return $this->json(['error' => 'Post déjà épinglé'], 409);
        }

        $count = $this->highlightRepo->countByUser($currentUser);
        if ($count >= 3) {
            return $this->json(['error' => 'Limite de 3 posts épinglés atteinte'], 409);
        }

        $highlight = new ProfileHighlight();
        $highlight->setUser($currentUser);
        $highlight->setPost($post);
        $highlight->setPosition($count);
        $highlight->setVisibility(Visibility::PUBLIC);

        $this->em->persist($highlight);
        $this->em->flush();

        return $this->json($this->toDto($highlight), 201);
    }

    #[Route('api/posts/{id}/pin-to-profile', name: 'highlight_unpin', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Desepingle un post du profil',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Post desepingle'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Post ou highlight non trouve')
        ]
    )]
    public function unpin(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $post = $this->postRepo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        if ($post->getAuthor() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $highlight = $this->highlightRepo->findOneBy(['user' => $currentUser, 'post' => $post]);
        if (!$highlight) {
            return $this->json(['error' => 'Highlight not found'], 404);
        }

        $this->em->remove($highlight);
        $this->em->flush();

        return $this->json(null, 204);
    }

    #[Route('api/user/{id}/highlights', name: 'highlight_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les posts epingles (Temps forts) d\'un utilisateur',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des highlights',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: ProfileHighlightResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    public function list(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $highlights = $this->highlightRepo->findByUserOrderedByPosition($user);
        $data = array_map([$this, 'toDto'], $highlights);

        return $this->json($data);
    }

    #[Route('api/user/{id}/engagement-summary', name: 'engagement_summary', methods: ['GET'])]
    #[OA\Get(
        summary: 'Résumé d\'engagement communautaire d\'un utilisateur',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Résumé d\'engagement',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'postCount', type: 'integer'),
                        new OA\Property(property: 'contributionCount', type: 'integer'),
                        new OA\Property(property: 'mentorRating', type: 'number', nullable: true)
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    public function engagementSummary(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $postCount = $user->getPosts()->count();
        $contributionCount = $postCount + $user->getComments()->count();

        $mentorProfile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        $mentorRating = $mentorProfile?->getAverageRating();

        return $this->json([
            'postCount'         => $postCount,
            'contributionCount' => $contributionCount,
            'mentorRating'      => $mentorRating,
        ]);
    }

    private function toDto(ProfileHighlight $highlight): ProfileHighlightResponse
    {
        $post = $highlight->getPost();
        $content = $post->getContent() ?? '';

        $dto = new ProfileHighlightResponse();
        $dto->id          = $highlight->getId();
        $dto->position    = $highlight->getPosition();
        $dto->visibility  = $highlight->getVisibility()->value;
        $dto->postId      = $post->getId();
        $dto->postContent = mb_strlen($content) > 280 ? mb_substr($content, 0, 280) . '…' : $content;
        $dto->postAuthor  = $post->getAuthor()->getUsername();
        return $dto;
    }
}
