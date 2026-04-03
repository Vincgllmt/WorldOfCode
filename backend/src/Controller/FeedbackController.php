<?php

namespace App\Controller;

use App\Entity\Feedback;
use App\Enum\FeedbackStatus;
use App\Repository\FeedbackRepository;
use App\Mapper\FeedbackMapper;
use App\Dto\FeedbackResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;

#[Route('/api/feedback')]
#[OA\Tag(name: 'Feedback')]
class FeedbackController extends AbstractController
{
    public function __construct(
        private FeedbackRepository $feedbackRepo,
        private FeedbackMapper $mapper
    ) {}

    ####
    ##
    ####
    #[Route('/mine', name: 'feedback_has_existing', methods: ['GET'])]
    #[OA\Get(
        summary: 'Verifie si l\'utilisateur a deja soumis un feedback',
        responses: [
            new OA\Response(response: 200, description: 'Statut du feedback existant')
        ]
    )]
    public function hasExisting(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $existing = $this->feedbackRepo->findOneBy(['user' => $this->getUser()], ['createdAt' => 'DESC']);

        return $this->json([
            'hasExisting' => $existing !== null,
        ]);
    }

    ####
    ##
    ####
    #[Route('', name: 'feedback_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Soumettre un retour utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['overallSatisfaction', 'easeOfUse', 'contentQuality', 'npsScore'],
                properties: [
                    new OA\Property(property: 'overallSatisfaction', type: 'integer', example: 4, description: 'Note 1-5'),
                    new OA\Property(property: 'easeOfUse', type: 'integer', example: 5, description: 'Note 1-5'),
                    new OA\Property(property: 'contentQuality', type: 'integer', example: 3, description: 'Note 1-5'),
                    new OA\Property(property: 'messagingRating', type: 'integer', example: 4, description: 'Note 1-5 (optionnel)', nullable: true),
                    new OA\Property(property: 'groupsRating', type: 'integer', example: 5, description: 'Note 1-5 (optionnel)', nullable: true),
                    new OA\Property(property: 'mentoringRating', type: 'integer', example: 3, description: 'Note 1-5 (optionnel)', nullable: true),
                    new OA\Property(property: 'npsScore', type: 'integer', example: 8, description: 'Score NPS 1-10'),
                    new OA\Property(property: 'comment', type: 'string', example: 'Super plateforme !', nullable: true),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Feedback enregistre'),
            new OA\Response(response: 400, description: 'Donnees invalides')
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);

        // Validation des champs obligatoires
        $required = ['overallSatisfaction', 'easeOfUse', 'contentQuality', 'npsScore'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return $this->json(['error' => "Le champ '$field' est obligatoire"], 400);
            }
        }

        // Validation des plages de valeurs
        $ratingFields = ['overallSatisfaction', 'easeOfUse', 'contentQuality', 'messagingRating', 'groupsRating', 'mentoringRating'];
        foreach ($ratingFields as $field) {
            if (isset($data[$field]) && ($data[$field] < 1 || $data[$field] > 5)) {
                return $this->json(['error' => "Le champ '$field' doit etre entre 1 et 5"], 400);
            }
        }

        if ($data['npsScore'] < 1 || $data['npsScore'] > 10) {
            return $this->json(['error' => 'Le score NPS doit etre entre 1 et 10'], 400);
        }

        $feedback = new Feedback();
        $feedback->setUser($this->getUser());
        $feedback->setOverallSatisfaction((int) $data['overallSatisfaction']);
        $feedback->setEaseOfUse((int) $data['easeOfUse']);
        $feedback->setContentQuality((int) $data['contentQuality']);
        $feedback->setMessagingRating(isset($data['messagingRating']) ? (int) $data['messagingRating'] : null);
        $feedback->setGroupsRating(isset($data['groupsRating']) ? (int) $data['groupsRating'] : null);
        $feedback->setMentoringRating(isset($data['mentoringRating']) ? (int) $data['mentoringRating'] : null);
        $feedback->setNpsScore((int) $data['npsScore']);
        $feedback->setComment($data['comment'] ?? null);

        $this->feedbackRepo->save($feedback);

        return $this->json(['success' => true, 'message' => 'Feedback enregistre'], 201);
    }

    ####
    ##
    ####
    #[Route('', name: 'feedback_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les feedbacks (admin uniquement)',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des feedbacks',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: FeedbackResponse::class))
                )
            ),
            new OA\Response(response: 403, description: 'Acces interdit')
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $feedbacks = $this->feedbackRepo->findBy([], ['createdAt' => 'DESC']);
        $data = array_map([$this->mapper, 'toDto'], $feedbacks);

        return $this->json($data);
    }
}
