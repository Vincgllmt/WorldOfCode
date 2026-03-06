<?php

namespace App\Service;

use App\Entity\TechWatchItem;
use App\Entity\TechWatchSource;
use App\Repository\TechWatchItemRepository;
use App\Repository\TechWatchSourceRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class RssFetcherService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private TechWatchItemRepository $itemRepo,
        private TechWatchSourceRepository $sourceRepo,
    ) {}

    public function fetchSource(TechWatchSource $source): int
    {
        $count = 0;
        try {
            $response = $this->httpClient->request('GET', $source->getFeedUrl(), [
                'timeout' => 10,
            ]);
            $xml = new \SimpleXMLElement($response->getContent());

            // RSS 2.0
            if (isset($xml->channel->item)) {
                foreach ($xml->channel->item as $entry) {
                    if ($this->processEntry($source, $entry, 'rss')) {
                        $count++;
                    }
                }
            }
            // Atom
            elseif (isset($xml->entry)) {
                foreach ($xml->entry as $entry) {
                    if ($this->processEntry($source, $entry, 'atom')) {
                        $count++;
                    }
                }
            }

            $source->setLastFetchedAt(new \DateTime());
            $this->sourceRepo->save($source, true);
        } catch (\Throwable $e) {
            // Un feed en erreur ne bloque pas les autres
        }

        return $count;
    }

    private function processEntry(TechWatchSource $source, \SimpleXMLElement $entry, string $format): bool
    {
        if ($format === 'rss') {
            $url = (string) $entry->link;
            $title = (string) $entry->title;
            $description = (string) ($entry->description ?? '');
            $pubDate = (string) ($entry->pubDate ?? '');
        } else {
            $url = (string) ($entry->link['href'] ?? $entry->link ?? '');
            $title = (string) $entry->title;
            $description = (string) ($entry->summary ?? $entry->content ?? '');
            $pubDate = (string) ($entry->published ?? $entry->updated ?? '');
        }

        if (empty($url) || empty($title)) {
            return false;
        }

        if ($this->itemRepo->existsByUrl($url)) {
            return false;
        }

        $item = new TechWatchItem();
        $item->setSource($source);
        $item->setTitle(mb_substr($title, 0, 500));
        $item->setDescription(mb_substr(strip_tags($description), 0, 1000) ?: null);
        $item->setUrl($url);

        if ($pubDate) {
            try {
                $item->setPublishedAt(new \DateTime($pubDate));
            } catch (\Exception) {
            }
        }

        try {
            $this->itemRepo->save($item, true);
            return true;
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }
}
