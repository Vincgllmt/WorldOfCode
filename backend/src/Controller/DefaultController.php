<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class DefaultController extends AbstractController
{
    #[Route('/testSuccess')]
    public function testSuccess(): Response
    {
        return new Response('success', 200);
    }
    #[Route('/testNotFound')]
    public function testNotFound(): Response
    {
        return new Response('not found', 404);
    }
    #[Route('/testError')]
    public function testError(): Response
    {
        return new Response('error', 500);
    }
}
