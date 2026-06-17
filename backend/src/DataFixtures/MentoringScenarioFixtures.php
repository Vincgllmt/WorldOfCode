<?php

namespace App\DataFixtures;

use App\Entity\MentorProfile;
use App\Entity\MentoringPin;
use App\Entity\MentoringRating;
use App\Entity\MentoringRequest;
use App\Entity\MentoringSession;
use App\Entity\SessionAppointment;
use App\Entity\SessionNote;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\MentoringRequestType;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\TeachingStyle;
use App\Repository\TechGroupRepository;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class MentoringScenarioFixtures extends Fixture implements DependentFixtureInterface
{
    public function __construct(
        private TechGroupRepository $techGroupRepo,
    ) {}

    public function getDependencies(): array
    {
        return [AppFixtures::class, GroupFixtures::class, MentoringFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $now   = new \DateTime();
        $group = fn(string $name) => $this->techGroupRepo->findOneBy(['name' => $name]);

        /** @var User $amine */
        $amine = $this->getReference('amine', User::class);

        // ─── Profil mentor Amine ──────────────────────────────────────────
        $profile = new MentorProfile();
        $profile->setUser($amine)
            ->setMentorBio('Lead dev Symfony/PHP depuis 5 ans. Je t\'aide à structurer ton code, déboguer tes API et maîtriser Docker.')
            ->setTeachingStyle(TeachingStyle::DIRECT)
            ->setIsAvailable(true)
            ->setMaxActiveMentees(5)
            ->setAverageRating(4.7)
            ->setTotalSessions(24)
            ->setReliabilityRate(0.96);

        foreach (['PHP', 'Symfony', 'Docker'] as $groupName) {
            $g = $group($groupName);
            if ($g !== null) {
                $profile->addSpecialty($g);
            }
        }

        $manager->persist($profile);
        $manager->flush();

        $this->addReference('amine_mentor_profile', $profile);

        // ─── Juniors disponibles (user_5 à user_9) ───────────────────────
        $juniors = [];
        for ($i = 5; $i <= 9; $i++) {
            $juniors[] = $this->getReference('user_' . $i, User::class);
        }

        // ─── Demandes en attente ciblant Amine ───────────────────────────
        $pendingConfigs = [
            [
                'junior'       => $juniors[0],
                'type'         => MentoringRequestType::DEBUG,
                'title'        => 'Erreur 500 Symfony sur une route POST',
                'techStack'    => 'Symfony',
                'description'  => 'Mon controller retourne une 500 sans message clair. J\'ai vérifié les services mais je sèche.',
                'blockedSince' => 'Hier soir',
                'alreadyTried' => 'Vérification des services, var_dump du service injecté',
                'isPublic'     => false,
            ],
            [
                'junior'      => $juniors[1],
                'type'        => MentoringRequestType::CODE_REVIEW,
                'title'       => 'Review de mon API REST Symfony',
                'techStack'   => 'PHP',
                'description' => 'J\'ai créé une API REST avec des controllers, des DTOs et de la validation. J\'aimerais un retour sur l\'architecture.',
                'isPublic'    => false,
            ],
            [
                'junior'       => $juniors[2],
                'type'         => MentoringRequestType::EXERCISE,
                'title'        => 'Comprendre les générateurs PHP',
                'techStack'    => 'PHP',
                'description'  => 'Je ne comprends pas l\'utilité de yield vs return dans un contexte de pipeline.',
                'blockedSince' => '2 jours',
                'isPublic'     => false,
            ],
            [
                'junior'      => $juniors[3],
                'type'        => MentoringRequestType::DEBUG,
                'title'       => 'Docker Compose réseau entre conteneurs',
                'techStack'   => 'Docker',
                'description' => 'Mon backend Symfony n\'arrive pas à joindre la base MySQL dans Docker Compose. Les conteneurs démarrent mais la connexion échoue.',
                'isPublic'    => true,
            ],
            [
                'junior'       => $juniors[4],
                'type'         => MentoringRequestType::ONE_TO_ONE,
                'title'       => 'Introduction aux Services Symfony',
                'techStack'   => 'Symfony',
                'description' => 'Je débute avec Symfony et je n\'arrive pas à saisir le rôle des services et l\'injection de dépendances.',
                'blockedSince'=> '3 jours',
                'isPublic'    => false,
            ],
            [
                'junior'      => $juniors[0],
                'type'        => MentoringRequestType::CODE_REVIEW,
                'title'       => 'Structure d\'une application JavaScript modulaire',
                'techStack'   => 'JavaScript',
                'description' => 'Comment organiser mon JS en modules sans framework ? J\'ai du code spaghetti et je voudrais refactoriser.',
                'isPublic'    => true,
            ],
        ];

        $requests = [];
        foreach ($pendingConfigs as $cfg) {
            $req = new MentoringRequest();
            $req->setJunior($cfg['junior'])
                ->setType($cfg['type'])
                ->setTitle($cfg['title'])
                ->setTechStack($cfg['techStack'])
                ->setDescription($cfg['description'])
                ->setIsPublic($cfg['isPublic'])
                ->setStatus(MentoringRequestStatus::PENDING);

            if (!empty($cfg['blockedSince'])) {
                $req->setBlockedSince($cfg['blockedSince']);
            }
            if (!empty($cfg['alreadyTried'])) {
                $req->setAlreadyTried($cfg['alreadyTried']);
            }

            $manager->persist($req);
            $requests[] = $req;
        }

        $manager->flush();

        // ─── Pin actif sur la 1re demande ────────────────────────────────
        $pin = new MentoringPin();
        $pin->setMentor($profile)->setRequest($requests[0])->setIsActive(true);
        $manager->persist($pin);
        $manager->flush();

        // ─── Sessions (2 SCHEDULED, 2 IN_PROGRESS, 2 COMPLETED, 1 CANCELLED) ──

        // SCHEDULED #1 — dans 2 jours
        $req1 = $this->makeAcceptedRequest($manager, $juniors[1], MentoringRequestType::DEBUG, 'Débogage Doctrine Query', 'Symfony', 'Ma requête DQL ne retourne pas les bons résultats en relation ManyToMany.');
        $sess1 = $this->makeSession($manager, $profile, $juniors[1], $req1, SessionFormat::TEXT, MentoringSessionStatus::SCHEDULED);
        $sess1->setScheduledAt((clone $now)->modify('+2 days'));
        $manager->flush();

        // SessionAppointment #1 confirmé
        $appt1 = new SessionAppointment();
        $appt1->setSession($sess1)
            ->setScheduledAt((clone $now)->modify('+2 days'))
            ->setFormat(SessionFormat::TEXT)
            ->setStatus('confirmed')
            ->setProposedBy('mentor');
        $manager->persist($appt1);

        // SCHEDULED #2 — dans 5 jours
        $req2 = $this->makeAcceptedRequest($manager, $juniors[2], MentoringRequestType::ONE_TO_ONE, 'Session Docker avancé', 'Docker', 'Je veux comprendre les volumes, réseaux et multi-stage builds.');
        $sess2 = $this->makeSession($manager, $profile, $juniors[2], $req2, SessionFormat::VIDEO, MentoringSessionStatus::SCHEDULED);
        $sess2->setScheduledAt((clone $now)->modify('+5 days'));
        $manager->flush();

        // SessionAppointment #2 pending (contre-proposition)
        $appt2 = new SessionAppointment();
        $appt2->setSession($sess2)
            ->setScheduledAt((clone $now)->modify('+5 days'))
            ->setFormat(SessionFormat::VIDEO)
            ->setStatus('pending')
            ->setProposedBy('junior');
        $manager->persist($appt2);

        // IN_PROGRESS #1 — démarrée il y a 20 min
        $req3 = $this->makeAcceptedRequest($manager, $juniors[3], MentoringRequestType::DEBUG, 'Bug CORS sur mon API', 'Symfony', 'Mon frontend React reçoit des erreurs CORS depuis le backend Symfony.');
        $sess3 = $this->makeSession($manager, $profile, $juniors[3], $req3, SessionFormat::TEXT, MentoringSessionStatus::IN_PROGRESS);
        $sess3->setStartedAt((clone $now)->modify('-20 minutes'));
        $manager->flush();

        // IN_PROGRESS #2 — démarrée il y a 1h
        $req4 = $this->makeAcceptedRequest($manager, $juniors[4], MentoringRequestType::EXERCISE, 'Exercice Symfony forms', 'Symfony', 'Je ne comprends pas comment les formulaires Symfony valident les données.');
        $sess4 = $this->makeSession($manager, $profile, $juniors[4], $req4, SessionFormat::HYBRID, MentoringSessionStatus::IN_PROGRESS);
        $sess4->setStartedAt((clone $now)->modify('-1 hour'));
        $manager->flush();

        // COMPLETED #1 — il y a 3 jours, avec ratings
        $req5 = $this->makeAcceptedRequest($manager, $juniors[0], MentoringRequestType::CODE_REVIEW, 'Review Entités Doctrine', 'PHP', 'Review de mes entités Doctrine avec relations complexes.');
        $sess5 = $this->makeSession($manager, $profile, $juniors[0], $req5, SessionFormat::TEXT, MentoringSessionStatus::COMPLETED);
        $sess5->setStartedAt((clone $now)->modify('-3 days'))->setCompletedAt((clone $now)->modify('-3 days +1 hour'));
        $manager->flush();

        $this->makeRatings($manager, $sess5, $juniors[0], $amine, 5, 'Super session, Amine est très pédagogue et patient !', 4, 'Junior très motivé, bonne compréhension rapide.');

        // SessionNote pour cette session
        $note1 = new SessionNote();
        $note1->setSession($sess5)->setAuthor($amine)
            ->setContent('Points clés abordés : lazy loading vs eager loading, cascade doctrine, optimisation N+1.')
            ->setType('note');
        $manager->persist($note1);

        // COMPLETED #2 — il y a 7 jours, avec ratings
        $req6 = $this->makeAcceptedRequest($manager, $juniors[1], MentoringRequestType::DEBUG, 'Problème JWT Authentication', 'Symfony', 'Mon token JWT expire trop vite, je ne comprends pas la configuration.');
        $sess6 = $this->makeSession($manager, $profile, $juniors[1], $req6, SessionFormat::VIDEO, MentoringSessionStatus::COMPLETED);
        $sess6->setStartedAt((clone $now)->modify('-7 days'))->setCompletedAt((clone $now)->modify('-7 days +45 minutes'));
        $manager->flush();

        $this->makeRatings($manager, $sess6, $juniors[1], $amine, 4, 'Problème résolu rapidement, merci !', 5, 'Excellent junior, très bien préparé avec du code d\'exemple.');

        // SessionNote lien pour la session 6
        $note2 = new SessionNote();
        $note2->setSession($sess6)->setAuthor($juniors[1])
            ->setContent('https://symfony.com/doc/current/security/access_token.html')
            ->setType('link');
        $manager->persist($note2);

        // CANCELLED — il y a 10 jours
        $req7 = $this->makeAcceptedRequest($manager, $juniors[2], MentoringRequestType::DEBUG, 'CSS Grid layout cassé', 'JavaScript', 'Mon layout Grid CSS ne s\'affiche pas correctement sur mobile.');
        $sess7 = $this->makeSession($manager, $profile, $juniors[2], $req7, SessionFormat::TEXT, MentoringSessionStatus::CANCELLED);
        $sess7->setScheduledAt((clone $now)->modify('-10 days'));
        $manager->flush();

        $manager->flush();

        echo "✅ MentoringScenarioFixtures : profil mentor Amine, 6 demandes en attente, 1 pin, 7 sessions (2 SCHEDULED, 2 IN_PROGRESS, 2 COMPLETED, 1 CANCELLED), 2 appointments, 2 notes\n";
    }

    private function makeAcceptedRequest(
        ObjectManager $manager,
        User $junior,
        MentoringRequestType $type,
        string $title,
        string $techStack,
        string $description,
    ): MentoringRequest {
        $req = new MentoringRequest();
        $req->setJunior($junior)->setType($type)->setTitle($title)
            ->setTechStack($techStack)->setDescription($description)
            ->setIsPublic(false)->setStatus(MentoringRequestStatus::ACCEPTED);
        $manager->persist($req);
        return $req;
    }

    private function makeSession(
        ObjectManager $manager,
        MentorProfile $profile,
        User $junior,
        MentoringRequest $req,
        SessionFormat $format,
        MentoringSessionStatus $status,
    ): MentoringSession {
        $session = new MentoringSession();
        $session->setMentor($profile)->setJunior($junior)->setRequest($req)
            ->setFormat($format)->setStatus($status);
        $manager->persist($session);
        return $session;
    }

    private function makeRatings(
        ObjectManager $manager,
        MentoringSession $session,
        User $junior,
        User $mentorUser,
        int $juniorScore,
        string $juniorComment,
        int $mentorScore,
        string $mentorComment,
    ): void {
        $rJunior = new MentoringRating();
        $rJunior->setSession($session)->setRater($junior)->setRatee($mentorUser)
            ->setScore($juniorScore)->setComment($juniorComment)
            ->setSubmittedAt(new \DateTime())->setIsVisible(true);
        $manager->persist($rJunior);

        $rMentor = new MentoringRating();
        $rMentor->setSession($session)->setRater($mentorUser)->setRatee($junior)
            ->setScore($mentorScore)->setComment($mentorComment)
            ->setSubmittedAt(new \DateTime())->setIsVisible(true);
        $manager->persist($rMentor);
    }
}
