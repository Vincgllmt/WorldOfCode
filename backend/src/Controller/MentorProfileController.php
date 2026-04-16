<?php

namespace App\Controller;

use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\TeachingStyle;
use App\Repository\MentorProfileRepository;
use App\Repository\SkillRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/mentor/profile')]
#[OA\Tag(name: 'MentorProfile')]
class MentorProfileController extends AbstractController
{
    public function __construct(
        private MentorProfileRepository $mentorProfileRepo,
        private SkillRepository $skillRepo,
    ) {}

    #[Route('', name: 'mentor_profile_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un profil mentor',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'specialties', type: 'array', items: new OA\Items(type: 'integer')),
                    new OA\Property(property: 'teachingStyle', type: 'string', enum: ['guided', 'direct', 'socratic', 'collaborative'], nullable: true),
                    new OA\Property(property: 'maxActiveMentees', type: 'integer', example: 3),
                    new OA\Property(property: 'mentorBio', type: 'string', nullable: true),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Profil mentor créé'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 409, description: 'Profil déjà existant'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw new \LogicException('Expected User entity');
        }

        $existing = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        if ($existing) {
            return $this->json([
                'error' => 'Vous avez déjà un profil mentor.',
                'code'  => 'MENTOR_PROFILE_ALREADY_EXISTS',
            ], 409);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->json(['error' => 'Corps de la requête JSON invalide.'], 400);
        }
        $data = $data ?? [];

        $maxMentees = (int) ($data['maxActiveMentees'] ?? 3);
        if ($maxMentees < 1 || $maxMentees > 10) {
            return $this->json(['error' => 'maxActiveMentees doit être entre 1 et 10.'], 422);
        }

        $style = null;
        if (!empty($data['teachingStyle'])) {
            $style = TeachingStyle::tryFrom($data['teachingStyle']);
            if ($style === null) {
                return $this->json(['error' => 'teachingStyle invalide.'], 422);
            }
        }

        $profile = new MentorProfile();
        $profile->setUser($user);
        $profile->setMaxActiveMentees($maxMentees);
        $profile->setMentorBio($data['mentorBio'] ?? null);

        if ($style !== null) {
            $profile->setTeachingStyle($style);
        }

        foreach ($data['specialties'] ?? [] as $skillId) {
            $skill = $this->skillRepo->find((int) $skillId);
            if (!$skill) {
                return $this->json(['error' => "Skill ID $skillId introuvable."], 422);
            }
            $profile->addSpecialty($skill);
        }

        try {
            $this->mentorProfileRepo->save($profile);
        } catch (UniqueConstraintViolationException) {
            return $this->json([
                'error' => 'Vous avez déjà un profil mentor.',
                'code'  => 'MENTOR_PROFILE_ALREADY_EXISTS',
            ], 409);
        }

        return $this->json($this->serializeProfile($profile), 201);
    }

    #[Route('', name: 'mentor_profile_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Récupérer son profil mentor',
        responses: [
            new OA\Response(response: 200, description: 'Profil mentor'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Profil non trouvé'),
        ]
    )]
    public function getMyProfile(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        if (!$profile) {
            return $this->json(['error' => 'Profil mentor non trouvé.'], 404);
        }

        return $this->json($this->serializeProfile($profile));
    }

    #[Route('', name: 'mentor_profile_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Mettre à jour son profil mentor',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'specialties', type: 'array', items: new OA\Items(type: 'integer')),
                    new OA\Property(property: 'teachingStyle', type: 'string', enum: ['guided', 'direct', 'socratic', 'collaborative'], nullable: true),
                    new OA\Property(property: 'maxActiveMentees', type: 'integer', example: 3),
                    new OA\Property(property: 'mentorBio', type: 'string', nullable: true),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Profil mis à jour'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Pas de profil mentor'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();

        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        if (!$profile) {
            return $this->json(['error' => 'Profil mentor non trouvé.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->json(['error' => 'Corps de la requête JSON invalide.'], 400);
        }
        $data = $data ?? [];

        if (isset($data['maxActiveMentees'])) {
            $max = (int) $data['maxActiveMentees'];
            if ($max < 1 || $max > 10) {
                return $this->json(['error' => 'maxActiveMentees doit être entre 1 et 10.'], 422);
            }
            $profile->setMaxActiveMentees($max);
        }

        if (array_key_exists('mentorBio', $data)) {
            $profile->setMentorBio($data['mentorBio']);
        }

        if (array_key_exists('teachingStyle', $data)) {
            if ($data['teachingStyle'] === null) {
                $profile->setTeachingStyle(null);
            } else {
                $style = TeachingStyle::tryFrom((string) $data['teachingStyle']);
                if ($style === null) {
                    return $this->json(['error' => 'teachingStyle invalide.'], 422);
                }
                $profile->setTeachingStyle($style);
            }
        }

        if (isset($data['specialties'])) {
            // Valider tous les IDs avant de modifier la collection
            $newSkills = [];
            foreach ($data['specialties'] as $skillId) {
                $skill = $this->skillRepo->find((int) $skillId);
                if (!$skill) {
                    return $this->json(['error' => "Skill ID $skillId introuvable."], 422);
                }
                $newSkills[] = $skill;
            }
            foreach ($profile->getSpecialties()->toArray() as $s) {
                $profile->removeSpecialty($s);
            }
            foreach ($newSkills as $skill) {
                $profile->addSpecialty($skill);
            }
        }

        $this->mentorProfileRepo->save($profile);

        return $this->json($this->serializeProfile($profile));
    }

    #[Route('/availability', name: 'mentor_profile_availability', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Basculer la disponibilité mentor',
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'isAvailable', type: 'boolean'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Disponibilité mise à jour'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Pas de profil mentor'),
        ]
    )]
    public function toggleAvailability(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();

        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        // Ne peut pas être null ici car IS_MENTOR a déjà vérifié l'existence

        if (!$profile) {
            return $this->json(['error' => 'Profil mentor non trouvé.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->json(['error' => 'Corps de la requête JSON invalide.'], 400);
        }
        $data = $data ?? [];

        if (isset($data['isAvailable'])) {
            $isAvailable = filter_var($data['isAvailable'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isAvailable === null) {
                return $this->json(['error' => 'isAvailable doit être un booléen.'], 422);
            }
        } else {
            $isAvailable = !$profile->isAvailable();
        }

        $profile->setIsAvailable($isAvailable);
        $this->mentorProfileRepo->save($profile);

        return $this->json([
            'isAvailable' => $profile->isAvailable(),
            'mode'        => $profile->isAvailable() ? 'disponible' : 'lecture',
        ]);
    }

    private function serializeProfile(MentorProfile $profile): array
    {
        return [
            'id'               => $profile->getId(),
            'isAvailable'      => $profile->isAvailable(),
            'teachingStyle'    => $profile->getTeachingStyle()?->value,
            'maxActiveMentees' => $profile->getMaxActiveMentees(),
            'mentorBio'        => $profile->getMentorBio(),
            'specialties'      => array_map(
                fn($s) => ['id' => $s->getId(), 'name' => $s->getName()],
                $profile->getSpecialties()->toArray()
            ),
            'averageRating'    => $profile->getAverageRating(),
            'reliabilityRate'  => $profile->getReliabilityRate(),
            'totalSessions'    => $profile->getTotalSessions(),
            'createdAt'        => $profile->getCreatedAt()->format('c'),
        ];
    }
}
