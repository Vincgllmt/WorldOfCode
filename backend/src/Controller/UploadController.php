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
    private const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 Mo
    private const MAX_ZIP_SIZE = 10 * 1024 * 1024;    // 10 Mo
    private const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const ALLOWED_ZIP_TYPES = ['application/zip', 'application/x-zip-compressed'];

    public function upload(Request $request, S3Storage $s3): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $file = $request->files->get('file');

        if (!$file) {
            return $this->json(['error' => 'Aucun fichier envoyé'], 400);
        }

        $mime = $file->getMimeType();
        $size = $file->getSize();

        $isImage = in_array($mime, self::ALLOWED_IMAGE_TYPES, true);
        $isZip = in_array($mime, self::ALLOWED_ZIP_TYPES, true);

        if (!$isImage && !$isZip) {
            return $this->json(['error' => 'Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, GIF, ZIP'], 400);
        }

        if ($isImage && $size > self::MAX_IMAGE_SIZE) {
            return $this->json(['error' => 'L\'image ne doit pas dépasser 5 Mo'], 400);
        }

        if ($isZip && $size > self::MAX_ZIP_SIZE) {
            return $this->json(['error' => 'Le fichier ZIP ne doit pas dépasser 10 Mo'], 400);
        }

        $key = time() . '-' . $file->getClientOriginalName();
        $localPath = $file->getPathname();

        $url = $s3->upload($key, $localPath, $mime);

        if (!$url) {
            return $this->json(['error' => 'Erreur upload MinIO'], 500);
        }

        return $this->json(['url' => $url]);
    }
}
