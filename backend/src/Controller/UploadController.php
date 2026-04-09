<?php

namespace App\Controller;

use App\Service\Storage\S3Storage;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Upload')]
class UploadController extends AbstractController
{
    #[Route('/api/upload', name: 'api_upload', methods: ['POST'])]
    #[OA\Post(
        summary: 'Upload un fichier sur le stockage S3 (MinIO)',
        description: 'Upload un fichier (image, document, etc.) sur le stockage objet et retourne l\'URL publique.',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Fichier à uploader'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Fichier uploadé avec succès',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'url', type: 'string', example: 'http://localhost:9000/uploads/1709654321-photo.jpg'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Aucun fichier envoyé'),
            new OA\Response(response: 500, description: 'Erreur lors de l\'upload'),
        ]
    )]
    public function upload(Request $request, S3Storage $s3): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $file = $request->files->get('file');

        if (!$file) {
            return $this->json(['error' => 'Aucun fichier envoyé'], 400);
        }

        $key = time() . '-' . $file->getClientOriginalName();
        $localPath = $file->getPathname();
        $mime = $file->getMimeType();

        $url = $s3->upload($key, $localPath, $mime);

        if (!$url) {
            return $this->json(['error' => 'Erreur upload MinIO'], 500);
        }

        return $this->json(['url' => $url]);
    }
}
