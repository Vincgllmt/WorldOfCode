<?php

namespace App\Controller;

use App\Entity\SessionNote;
use App\Entity\User;
use App\Repository\MentoringSessionRepository;
use App\Repository\SessionNoteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'SessionNote')]
class SessionNoteController extends AbstractController
{
    public function __construct(
        private MentoringSessionRepository $sessionRepo,
        private SessionNoteRepository $noteRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/api/mentoring/sessions/{id}/notes', name: 'session_notes_list', methods: ['GET'])]
    #[OA\Get(summary: 'Notes d\'une session', responses: [
        new OA\Response(response: 200, description: 'OK'),
        new OA\Response(response: 403, description: 'Non participant'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
    ])]
    public function list(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getJunior() !== $user && $session->getMentor()->getUser() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $notes = $this->noteRepo->findBy(['session' => $session], ['createdAt' => 'ASC']);
        return $this->json(array_map([$this, 'serialize'], $notes));
    }

    #[Route('/api/mentoring/sessions/{id}/notes', name: 'session_notes_create', methods: ['POST'])]
    #[OA\Post(summary: 'Ajouter une note', responses: [
        new OA\Response(response: 201, description: 'Note créée'),
        new OA\Response(response: 403, description: 'Non participant'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
        new OA\Response(response: 422, description: 'Contenu requis'),
    ])]
    public function create(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getJunior() !== $user && $session->getMentor()->getUser() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $content = trim($data['content'] ?? '');
        if ($content === '') {
            return $this->json(['error' => 'Le contenu est requis.'], 422);
        }

        $type = in_array($data['type'] ?? '', ['note', 'link'], true) ? $data['type'] : 'note';

        $note = new SessionNote();
        $note->setSession($session);
        $note->setAuthor($user);
        $note->setContent($content);
        $note->setType($type);

        $this->em->persist($note);
        $this->em->flush();

        return $this->json($this->serialize($note), 201);
    }

    #[Route('/api/mentoring/sessions/{id}/notes/{noteId}', name: 'session_notes_delete', methods: ['DELETE'])]
    #[OA\Delete(summary: 'Supprimer une note', responses: [
        new OA\Response(response: 200, description: 'Note supprimée'),
        new OA\Response(response: 403, description: 'Non auteur'),
        new OA\Response(response: 404, description: 'Note non trouvée'),
    ])]
    public function delete(int $id, int $noteId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $note = $this->noteRepo->find($noteId);
        if (!$note || $note->getSession()->getId() !== $id) {
            return $this->json(['error' => 'Note non trouvée.'], 404);
        }
        if ($note->getAuthor() !== $user) {
            return $this->json(['error' => 'Vous ne pouvez supprimer que vos propres notes.'], 403);
        }

        $this->em->remove($note);
        $this->em->flush();

        return $this->json(['message' => 'Note supprimée.']);
    }

    private function serialize(SessionNote $n): array
    {
        return [
            'id'        => $n->getId(),
            'content'   => $n->getContent(),
            'type'      => $n->getType(),
            'author'    => ['id' => $n->getAuthor()->getId(), 'username' => $n->getAuthor()->getUsername()],
            'createdAt' => $n->getCreatedAt()->format('c'),
        ];
    }
}
