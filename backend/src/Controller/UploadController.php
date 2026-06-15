<?php

namespace App\Controller;

use App\Config\UploadConfig;
use App\Service\ImageCompressionService;
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
    public function upload(
        Request $request,
        S3Storage $s3,
        ImageCompressionService $imageCompression,
    ): Response
    {
        $file = $request->files->get('file');

        if (!$file) {
            return $this->json(['error' => 'Aucun fichier envoyé'], 400);
        }

        $mime = $file->getMimeType();

        if (!UploadConfig::isAllowedMime($mime)) {
            $allowed = UploadConfig::allowedFormatsLabel();
            return $this->json(['error' => "Format non supporté. Utilisez $allowed."], 415);
        }

        $maxBytes = UploadConfig::maxSizeBytesForMime($mime);
        $maxMb    = UploadConfig::maxSizeMbForMime($mime);

        if ($file->getSize() > $maxBytes) {
            return $this->json(['error' => "Le fichier ne doit pas dépasser {$maxMb} Mo."], 413);
        }

        $originalName = $file->getClientOriginalName();
        $localPath    = $file->getPathname();
        $finalMime    = $mime;
        $tmpCompressed = null;

        // Optimisation : redimensionnement + conversion WebP pour les images.
        $processed = $imageCompression->process($localPath, $mime);
        if ($processed['path'] !== $localPath) {
            $tmpCompressed = $processed['path'];
            $localPath     = $processed['path'];
            $finalMime     = $processed['mime'];
            $originalName  = pathinfo($originalName, PATHINFO_FILENAME) . '.webp';
        }

        // SEC-4 (fixé) : clé non-devinable (UUID v4) au lieu de <timestamp>-<filename>
        // qui était énumérable. Le bucket MinIO étant en `download anonymous` (lecture
        // publique sur clé connue uniquement), une clé imprévisible (122 bits d'entropie)
        // ferme le vecteur d'attaque par devinette/scan.
        $extension = pathinfo($originalName, PATHINFO_EXTENSION) ?: 'bin';
        $key = sprintf('%d-%s.%s', time(), bin2hex(random_bytes(16)), strtolower($extension));
        $url = $s3->upload($key, $localPath, $finalMime);

        // Nettoyage du fichier temporaire de compression
        if ($tmpCompressed !== null && file_exists($tmpCompressed)) {
            @unlink($tmpCompressed);
        }

        if (!$url) {
            return $this->json(['error' => 'Erreur upload MinIO'], 500);
        }

        return $this->json(['url' => $url]);
    }
}
