<?php

namespace App\Controller;

use App\Entity\MentoringPin;
use App\Entity\User;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentoringPin')]
class MentoringPinController extends AbstractController
{
    public function __construct(
        private MentoringRequestRepository $requestRepo,
        private MentoringPinRepository $pinRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/api/mentor/requests/{id}/pin', name: 'mentor_request_pin', methods: ['POST'])]
    #[OA\Post(
        summary: 'Épingler une demande (réserve 2h)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 201, description: 'Pin créé'),
            new OA\Response(response: 409, description: 'Déjà épinglée'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
        ]
    )]
    public function pin(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }

        // Vérifier qu'aucun pin actif n'existe déjà sur cette demande (par n'importe quel mentor)
        $existingPin = $this->pinRepo->findOneBy([
            'request'  => $mentoringRequest,
            'isActive' => true,
        ]);
        if ($existingPin) {
            return $this->json([
                'error' => 'Cette demande est déjà réservée par un autre mentor.',
                'code'  => 'REQUEST_ALREADY_PINNED',
            ], 409);
        }

        // Vérifier que ce mentor n'a pas déjà un pin actif sur cette demande
        $ownPin = $this->pinRepo->findOneBy([
            'mentor'   => $profile,
            'request'  => $mentoringRequest,
            'isActive' => true,
        ]);
        if ($ownPin) {
            return $this->json([
                'error' => 'Vous avez déjà épinglé cette demande.',
                'code'  => 'REQUEST_ALREADY_PINNED',
            ], 409);
        }

        $pin = new MentoringPin();
        $pin->setMentor($profile);
        $pin->setRequest($mentoringRequest);

        $this->em->persist($pin);
        $this->em->flush();

        return $this->json([
            'id'        => $pin->getId(),
            'expiresAt' => $pin->getExpiresAt()->format('c'),
            'isActive'  => $pin->isActive(),
        ], 201);
    }

    #[Route('/api/mentor/requests/{id}/pin', name: 'mentor_request_unpin', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Désépingler une demande',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Pin désactivé'),
            new OA\Response(response: 404, description: 'Pin non trouvé'),
        ]
    )]
    public function unpin(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }

        $pin = $this->pinRepo->findOneBy([
            'mentor'   => $profile,
            'request'  => $mentoringRequest,
            'isActive' => true,
        ]);
        if (!$pin) {
            return $this->json(['error' => 'Aucun pin actif trouvé.'], 404);
        }

        $pin->setIsActive(false);
        $this->em->flush();

        return $this->json(['message' => 'Demande désépinglée.']);
    }
}
