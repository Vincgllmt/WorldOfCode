<?php

namespace App\Service\Elasticsearch;

use App\Entity\Post;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

class PostIndexer
{
    private const INDEX = IndexDefinitions::POSTS_INDEX;

    private LoggerInterface $logger;

    public function __construct(
        private readonly ElasticClient $elasticClient,
        ?LoggerInterface $logger = null,
    ) {
        $this->logger = $logger ?? new NullLogger();
    }

    public function createIndexIfNotExists(): bool
    {
        if ($this->elasticClient->indexExists(self::INDEX)) {
            return false;
        }
        $this->elasticClient->createIndex(self::INDEX, IndexDefinitions::postsMapping());
        return true;
    }

    public function index(Post $post): void
    {
        if ($post->getId() === null) {
            return;
        }

        try {
            $this->elasticClient->indexDocument(self::INDEX, (string) $post->getId(), $this->toDocument($post));
        } catch (\Throwable $e) {
            $this->logger->warning('Échec d\'indexation Elasticsearch pour le post.', [
                'postId' => $post->getId(),
                'error'  => $e->getMessage(),
            ]);
        }
    }

    public function delete(int $postId): void
    {
        try {
            $this->elasticClient->deleteDocument(self::INDEX, (string) $postId);
        } catch (\Throwable $e) {
            $this->logger->warning('Échec de suppression Elasticsearch pour le post.', [
                'postId' => $postId,
                'error'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param iterable<Post> $posts
     * @return int Nombre de documents envoyés
     */
    public function bulkIndex(iterable $posts): int
    {
        $body = [];
        $count = 0;
        foreach ($posts as $post) {
            if ($post->getId() === null) {
                continue;
            }
            $body[] = ['index' => ['_index' => self::INDEX, '_id' => (string) $post->getId()]];
            $body[] = $this->toDocument($post);
            $count++;
        }
        if ($count === 0) {
            return 0;
        }

        $this->elasticClient->bulk($body);
        return $count;
    }

    /**
     * @return array<string, mixed>
     */
    private function toDocument(Post $post): array
    {
        $author = $post->getAuthor();
        $group  = $post->getTechGroup();
        return [
            'content'        => $this->normalizeContent($post->getContent()),
            'authorId'       => $author->getId(),
            'authorUsername' => $author->getUsername(),
            'groupId'        => $group?->getId(),
            'groupName'      => $group?->getName(),
            'createdAt'      => $post->getCreatedAt()?->format('c'),
            'imageUrl'       => $post->getImageUrl(),
            'likesCount'     => $post->getLikesCount(),
        ];
    }

    /**
     * Convertit le contenu HTML (TinyMCE) en texte brut indexable.
     */
    private function normalizeContent(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }
        $plain = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/u', ' ', $plain) ?? $plain);
    }
}
