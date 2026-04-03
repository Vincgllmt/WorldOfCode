<?php

namespace App\Controller;

use App\Dto\AdminPostSummaryDto;
use App\Dto\AdminUserDetailDto;
use App\Dto\AdminUserListItemDto;
use App\Mapper\SkillMapper;
use App\Mapper\UserLinkMapper;
use App\Repository\ReportRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminUserController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private ReportRepository $reportRepo,
        private SkillMapper $skillMapper,
        private UserLinkMapper $linkMapper,
    ) {}

    #[Route('/users', name: 'admin_users_list', methods: ['GET'])]
    #[OA\Get(
        summary: "Liste enrichie des utilisateurs pour l'administration",
        responses: [
            new OA\Response(response: 200, description: 'Liste des utilisateurs avec compteurs'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $rows = $this->userRepo->findAllWithCounts();

        $dtos = array_map(fn($row) => new AdminUserListItemDto(
            id: $row['id'],
            username: $row['username'],
            email: $row['email'],
            role: $row['role'] instanceof \App\Enum\UserRole
                ? $row['role']->value
                : (string) $row['role'],
            creationDate: $row['creationDate'] instanceof \DateTimeInterface
                ? $row['creationDate']->format(\DateTimeInterface::ATOM)
                : (string) $row['creationDate'],
            postCount: (int) $row['postCount'],
            followerCount: (int) $row['followerCount'],
            avatarUrl: $row['avatarUrl'] ?? null,
        ), $rows);

        return $this->json($dtos);
    }

    #[Route('/users/{id}', name: 'admin_user_detail', methods: ['GET'])]
    #[OA\Get(
        summary: "Détail complet d'un utilisateur pour l'administration",
        responses: [
            new OA\Response(response: 200, description: "Profil complet de l'utilisateur"),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé'),
        ]
    )]
    public function detail(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $user = $this->userRepo->find($id);
        if (!$user) {
            throw new NotFoundHttpException('Utilisateur non trouvé');
        }

        $posts = $user->getPosts()->toArray();
        usort($posts, fn($a, $b) => $b->getCreatedAt() <=> $a->getCreatedAt());
        $lastFive = array_slice($posts, 0, 5);

        $lastFiveDtos = array_map(function ($post) {
            $content = $post->getContent() ?? '';
            $excerpt = mb_strlen($content) > 80
                ? mb_substr($content, 0, 80) . '…'
                : ($content ?: null);

            return new AdminPostSummaryDto(
                id: $post->getId(),
                excerpt: $excerpt,
                createdAt: $post->getCreatedAt()->format(\DateTimeInterface::ATOM),
                likesCount: $post->getLikes()->count(),
                commentsCount: $post->getComments()->count(),
            );
        }, $lastFive);

        $dto = new AdminUserDetailDto(
            id: $user->getId(),
            username: $user->getUsername(),
            firstname: $user->getFirstname(),
            lastname: $user->getLastname(),
            email: $user->getEmail(),
            role: $user->getRole()->value,
            creationDate: $user->getCreationDate()->format(\DateTimeInterface::ATOM),
            avatarUrl: $user->getAvatarUrl(),
            bio: $user->getBio(),
            location: $user->getLocation(),
            availability: $user->getAvailability()?->value,
            experiences: $user->getExperiences(),
            skills: array_map([$this->skillMapper, 'toDto'], $user->getSkills()->toArray()),
            links: array_map([$this->linkMapper, 'toDto'], $user->getLinks()->toArray()),
            lastFivePosts: $lastFiveDtos,
            reportCountOnPosts: $this->reportRepo->countByAuthorId($user->getId()),
        );

        return $this->json($dto);
    }
}
