<?php

namespace App\Controller;

use App\Service\Storage\S3Storage;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class UploadController extends AbstractController
{
    #[Route('/api/upload', name: 'api_upload', methods: ['POST'])]
    public function upload(Request $request, S3Storage $s3): Response
    {
        $file = $request->files->get('file');

        if (!$file) {
            return new Response('Aucun fichier envoyé', 400);
        }

        $key = time() . '-' . $file->getClientOriginalName();
        $localPath = $file->getPathname();
        $mime = $file->getMimeType();

        $url = $s3->upload($key, $localPath, $mime);

        if (!$url) {
            return new Response('Erreur upload MinIO', 500);
        }

        return $this->json(['url' => $url]);
    }
}
