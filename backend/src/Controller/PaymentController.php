<?php

namespace App\Controller;

use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\PaymentRepository;
use App\Repository\UserRepository;
use App\Service\StripeConnectService;
use App\Service\StripeService;
use Stripe\Exception\SignatureVerificationException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/payment')]
#[OA\Tag(name: 'Payment')]
class PaymentController extends AbstractController
{
    public function __construct(
        private StripeService $stripeService,
        private StripeConnectService $connectService,
        private UserRepository $userRepository,
        private MentorProfileRepository $mentorProfileRepository,
        private MentoringSessionRepository $sessionRepository,
        private PaymentRepository $paymentRepository,
    ) {}

    /**
     * Crée un PaymentIntent (destination charge) pour payer un mentor,
     * ou proposer un don au mentor d'une session de mentorat terminée.
     *
     * Body JSON : { "mentor_id": int, "amount": int (centimes), "currency": string }
     *          ou { "session_id": int, "amount": int (centimes), "currency": string }
     */
    #[Route('/intent', name: 'payment_intent_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un PaymentIntent Stripe (paiement mentor ou don de fin de session)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['amount'],
                properties: [
                    new OA\Property(property: 'mentor_id', type: 'integer', example: 42),
                    new OA\Property(property: 'session_id', type: 'integer', example: 7),
                    new OA\Property(property: 'amount', type: 'integer', example: 5000, description: 'Montant en centimes'),
                    new OA\Property(property: 'currency', type: 'string', example: 'eur'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'client_secret du PaymentIntent'),
            new OA\Response(response: 400, description: 'Paramètres invalides ou mentor non onboardé'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Mentor ou session introuvable'),
        ]
    )]
    public function createIntent(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $payer */
        $payer = $this->getUser();

        $data      = json_decode($request->getContent(), true) ?? [];
        $sessionId = $data['session_id'] ?? null;
        $amount    = $data['amount'] ?? null;
        $currency  = $data['currency'] ?? 'eur';
        $session   = null;

        if (!$amount || $amount < 50) {
            return $this->json(['error' => 'amount (≥ 50 centimes) est requis.'], Response::HTTP_BAD_REQUEST);
        }

        if ($sessionId) {
            $session = $this->sessionRepository->find($sessionId);
            if (!$session) {
                return $this->json(['error' => 'Session non trouvée.'], Response::HTTP_NOT_FOUND);
            }
            if ($session->getJunior() !== $payer) {
                return $this->json(['error' => 'Accès non autorisé.'], Response::HTTP_FORBIDDEN);
            }
            if ($session->getStatus() !== MentoringSessionStatus::COMPLETED) {
                return $this->json(['error' => 'La session doit être terminée pour proposer un don.'], Response::HTTP_BAD_REQUEST);
            }
            $mentor = $session->getMentor()->getUser();
        } else {
            $mentorId = $data['mentor_id'] ?? null;
            if (!$mentorId) {
                return $this->json(['error' => 'mentor_id ou session_id est requis.'], Response::HTTP_BAD_REQUEST);
            }
            $mentor = $this->userRepository->find($mentorId);
            if (!$mentor) {
                return $this->json(['error' => 'Mentor introuvable.'], Response::HTTP_NOT_FOUND);
            }
        }

        if ($mentor->getId() === $payer->getId()) {
            return $this->json(['error' => 'Vous ne pouvez pas vous payer vous-même.'], Response::HTTP_BAD_REQUEST);
        }

        $mentorProfile = $this->mentorProfileRepository->findOneBy(['user' => $mentor]);
        if (!$mentorProfile || !$mentorProfile->isStripeTransfersEnabled()) {
            return $this->json(['error' => 'Ce mentor n\'a pas encore configuré son compte de paiement.'], Response::HTTP_BAD_REQUEST);
        }

        $fee    = $this->connectService->calculateApplicationFee((int) $amount);
        $intent = $this->stripeService->createPaymentIntent(
            $payer,
            $mentor,
            (int) $amount,
            $currency,
            $mentorProfile->getStripeAccountId(),
            $fee,
            $session,
        );

        return $this->json([
            'client_secret'          => $intent->client_secret,
            'payment_intent_id'      => $intent->id,
            'application_fee_cents'  => $fee,
        ]);
    }

    /**
     * Statut de don pour une session de mentorat : le mentor accepte-t-il les dons
     * (compte Stripe actif), et existe-t-il déjà un paiement pour cette session ?
     */
    #[Route('/session/{sessionId}/status', name: 'payment_session_status', methods: ['GET'])]
    #[OA\Get(
        summary: 'Statut de don pour une session de mentorat',
        responses: [
            new OA\Response(response: 200, description: 'mentorReady + dernier paiement éventuel'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Session introuvable'),
        ]
    )]
    public function getSessionDonationStatus(int $sessionId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $user */
        $user = $this->getUser();

        $session = $this->sessionRepository->find($sessionId);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        $mentorUser = $session->getMentor()->getUser();
        if ($session->getJunior() !== $user && $mentorUser !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], Response::HTTP_FORBIDDEN);
        }

        $mentorProfile = $this->mentorProfileRepository->findOneBy(['user' => $mentorUser]);
        $payment       = $this->paymentRepository->findLatestForSession($session);

        return $this->json([
            'mentorReady' => $mentorProfile?->isStripeTransfersEnabled() ?? false,
            'payment'     => $payment ? [
                'status'    => $payment->getStatus()->value,
                'amount'    => $payment->getAmount(),
                'currency'  => $payment->getCurrency(),
                'createdAt' => $payment->getCreatedAt()->format('c'),
            ] : null,
        ]);
    }

    /**
     * Webhook Stripe — ne pas protéger par JWT, Stripe envoie sa propre signature.
     */
    #[Route('/webhook', name: 'payment_webhook', methods: ['POST'])]
    #[OA\Post(summary: 'Webhook Stripe (usage interne)', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function webhook(Request $request): Response
    {
        $payload   = $request->getContent();
        $sigHeader = $request->headers->get('Stripe-Signature', '');

        try {
            $event = $this->stripeService->constructWebhookEvent($payload, $sigHeader);
        } catch (SignatureVerificationException) {
            return new Response('Invalid signature', Response::HTTP_BAD_REQUEST);
        } catch (\UnexpectedValueException) {
            return new Response('Invalid payload', Response::HTTP_BAD_REQUEST);
        }

        $this->stripeService->handleEvent($event);

        return new Response('OK', Response::HTTP_OK);
    }
}
