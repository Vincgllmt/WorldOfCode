<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\MentorProfileRepository;
use App\Service\StripeConnectService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/stripe/connect')]
#[OA\Tag(name: 'Stripe Connect')]
class StripeConnectController extends AbstractController
{
    public function __construct(
        private StripeConnectService $connectService,
        private MentorProfileRepository $mentorProfileRepository,
        private EntityManagerInterface $em,
    ) {}

    /**
     * Démarre ou reprend l'onboarding Stripe Connect pour le mentor connecté.
     * Crée le compte connecté s'il n'existe pas encore, puis retourne l'URL d'onboarding.
     */
    #[Route('/onboard', name: 'stripe_connect_onboard', methods: ['POST'])]
    #[OA\Post(
        summary: 'Lancer l\'onboarding Stripe Connect (mentor)',
        responses: [
            new OA\Response(response: 200, description: 'URL d\'onboarding Stripe'),
            new OA\Response(response: 403, description: 'Accès refusé (non mentor)'),
        ]
    )]
    public function onboard(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $user */
        $user    = $this->getUser();
        $profile = $this->mentorProfileRepository->findOneBy(['user' => $user]);

        if (!$profile) {
            return $this->json(['error' => 'Profil mentor introuvable.'], Response::HTTP_FORBIDDEN);
        }

        if ($profile->getStripeAccountId() === null) {
            $accountId = $this->connectService->createConnectedAccount($user);
            $profile->setStripeAccountId($accountId);
            $this->em->flush();
        }

        $onboardingUrl = $this->connectService->generateAccountLink($profile->getStripeAccountId());

        return $this->json(['onboarding_url' => $onboardingUrl]);
    }

    /**
     * Retourne le statut du compte connecté Stripe du mentor.
     */
    #[Route('/status', name: 'stripe_connect_status', methods: ['GET'])]
    #[OA\Get(
        summary: 'Statut du compte connecté Stripe (mentor)',
        responses: [
            new OA\Response(response: 200, description: 'Statut du compte connecté'),
            new OA\Response(response: 403, description: 'Accès refusé (non mentor)'),
        ]
    )]
    public function status(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $user */
        $user    = $this->getUser();
        $profile = $this->mentorProfileRepository->findOneBy(['user' => $user]);

        if (!$profile) {
            return $this->json(['error' => 'Profil mentor introuvable.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json([
            'stripe_account_id'      => $profile->getStripeAccountId(),
            'transfers_enabled'      => $profile->isStripeTransfersEnabled(),
            'onboarding_required'    => $profile->getStripeAccountId() === null || !$profile->isStripeTransfersEnabled(),
        ]);
    }
}
