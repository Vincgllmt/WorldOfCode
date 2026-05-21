<?php

namespace App\Tests\Service;

use App\Entity\TechWatchSource;
use App\Repository\TechWatchItemRepository;
use App\Repository\TechWatchSourceRepository;
use App\Service\RssFetcherService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\Driver\Exception as DriverException;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * 🎮 StarCraft - Tests unitaires du RssFetcherService
 *
 * JimRaynor    = source RSS qui produit des articles de veille technologique
 * SarahKerrigan = source Atom (la Reine des Lames, format alternatif)
 */
class RssFetcherServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildSource(string $url = 'https://blog.raynor.sc/feed.rss'): TechWatchSource
    {
        $source = new TechWatchSource();
        $source->setFeedUrl($url);
        $source->setName('Raynor Tech Blog');

        return $source;
    }

    private function makeService(
        HttpClientInterface $httpClient,
        TechWatchItemRepository $itemRepo,
        TechWatchSourceRepository $sourceRepo,
    ): RssFetcherService {
        return new RssFetcherService($httpClient, $itemRepo, $sourceRepo);
    }

    private function mockHttpResponse(string $content): ResponseInterface
    {
        $response = $this->createMock(ResponseInterface::class);
        $response->method('getContent')->willReturn($content);

        return $response;
    }

    private function buildRssXml(array $items): string
    {
        $itemsXml = '';
        foreach ($items as $item) {
            $itemsXml .= sprintf(
                '<item><title>%s</title><link>%s</link><description>%s</description><pubDate>%s</pubDate></item>',
                $item['title'],
                $item['link'],
                $item['description'] ?? '',
                $item['pubDate'] ?? 'Mon, 01 Jan 2024 00:00:00 +0000'
            );
        }

        return sprintf(
            '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>%s</channel></rss>',
            $itemsXml
        );
    }

    private function buildAtomXml(array $entries): string
    {
        $entriesXml = '';
        foreach ($entries as $entry) {
            $entriesXml .= sprintf(
                '<entry><title>%s</title><link href="%s"/><summary>%s</summary><published>%s</published></entry>',
                $entry['title'],
                $entry['link'],
                $entry['summary'] ?? '',
                $entry['published'] ?? '2024-01-01T00:00:00Z'
            );
        }

        return sprintf(
            '<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">%s</feed>',
            $entriesXml
        );
    }

    // ======================================================================
    //  fetchSource() — format RSS 2.0
    // ======================================================================

    public function testFetchSourceRssReturnsCountOfNewItems(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => 'SC2 Patch Notes', 'link' => 'https://sc2.blizzard.com/patch-4-0'],
            ['title' => 'Wings of Liberty Tips', 'link' => 'https://sc2.blizzard.com/tips'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(false);
        $itemRepo->expects($this->exactly(2))->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);
        $sourceRepo->expects($this->once())->method('save');

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(2, $count);
    }

    public function testFetchSourceRssSkipsAlreadyExistingItems(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => 'SC2 Old News', 'link' => 'https://sc2.blizzard.com/old-news'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(true);
        $itemRepo->expects($this->never())->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(0, $count);
    }

    public function testFetchSourceRssSkipsItemsWithEmptyTitle(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => '', 'link' => 'https://sc2.blizzard.com/no-title'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->expects($this->never())->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(0, $count);
    }

    public function testFetchSourceRssSkipsItemsWithEmptyUrl(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => 'No URL Article', 'link' => ''],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->expects($this->never())->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(0, $count);
    }

    // ======================================================================
    //  fetchSource() — format Atom
    // ======================================================================

    public function testFetchSourceAtomReturnsCountOfNewItems(): void
    {
        $source = $this->buildSource('https://blog.kerrigan.sc/atom.xml');
        $xml = $this->buildAtomXml([
            ['title' => 'Zerg Rush Strategy', 'link' => 'https://kerrigan.sc/zerg-rush'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(false);
        $itemRepo->expects($this->once())->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);
        $sourceRepo->expects($this->once())->method('save');

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(1, $count);
    }

    // ======================================================================
    //  fetchSource() — erreurs réseau
    // ======================================================================

    public function testFetchSourceReturnsZeroOnHttpError(): void
    {
        $source = $this->buildSource();

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willThrowException(new \RuntimeException('Connection refused'));

        $itemRepo   = $this->createMock(TechWatchItemRepository::class);
        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(0, $count);
    }

    public function testFetchSourceReturnsZeroOnInvalidXml(): void
    {
        $source = $this->buildSource();

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse('not valid xml ###'));

        $itemRepo   = $this->createMock(TechWatchItemRepository::class);
        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(0, $count);
    }

    // ======================================================================
    //  fetchSource() — pubDate invalide (catch \Exception ligne 86)
    // ======================================================================

    public function testFetchSourceIgnoresInvalidPubDate(): void
    {
        $source = $this->buildSource();
        // pubDate qui jette DateTime::__construct : chaîne non parsable
        $xml = $this->buildRssXml([
            ['title' => 'Article avec date pourrie', 'link' => 'https://sc2.blizzard.com/bad-date', 'pubDate' => 'pas-une-date-du-tout'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(false);
        // L'item doit quand même être sauvegardé malgré la date pourrie
        $itemRepo->expects($this->once())->method('save');

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertSame(1, $count);
    }

    // ======================================================================
    //  fetchSource() — collision unique (catch UniqueConstraintViolationException lignes 93-94)
    // ======================================================================

    public function testFetchSourceReturnsZeroWhenSaveTriggersUniqueViolation(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => 'Article dupliqué côté DB', 'link' => 'https://sc2.blizzard.com/duplicate'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        // existsByUrl renvoie false mais save jette une UniqueConstraintViolation
        // (race-condition typique : un autre process a inséré l'item entre les deux)
        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(false);
        $driverException = $this->createMock(DriverException::class);
        $itemRepo->method('save')->willThrowException(
            new UniqueConstraintViolationException($driverException, null)
        );

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $count = $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        // L'item dupliqué est ignoré → count reste à 0
        $this->assertSame(0, $count);
    }

    public function testFetchSourceUpdatesLastFetchedAtOnSuccess(): void
    {
        $source = $this->buildSource();
        $xml = $this->buildRssXml([
            ['title' => 'Latest SC2 News', 'link' => 'https://sc2.blizzard.com/latest'],
        ]);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($this->mockHttpResponse($xml));

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('existsByUrl')->willReturn(false);

        $sourceRepo = $this->createMock(TechWatchSourceRepository::class);

        $this->assertNull($source->getLastFetchedAt());

        $this->makeService($httpClient, $itemRepo, $sourceRepo)->fetchSource($source);

        $this->assertNotNull($source->getLastFetchedAt());
    }
}
