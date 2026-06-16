<?php

namespace App\DataFixtures;

use App\Entity\MentorProfile;
use App\Entity\MentoringPin;
use App\Entity\MentoringRating;
use App\Entity\MentoringRequest;
use App\Entity\MentoringSession;
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

class MentoringFixtures extends Fixture implements DependentFixtureInterface
{
    public function __construct(
        private TechGroupRepository $techGroupRepo,
    ) {}

    public function getDependencies(): array
    {
        return [AppFixtures::class, SkillFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $now = new \DateTime();
        $skill = fn(string $name) => $this->techGroupRepo->findOneBy(['name' => $name]);

        // ─── 1. PROFILS MENTOR (users 0-4) ────────────────────────────────
        //   user_0 = sarah.dev, user_1 = julien_tech, user_2 = marie.code,
        //   user_3 = thomas_dev, user_4 = emma.fullstack
        $mentorConfigs = [
            [
                'ref'         => 'user_0',
                'bio'         => 'Je t\'aide à débloquer tes problèmes PHP et Symfony avec une approche guidée, étape par étape.',
                'style'       => TeachingStyle::GUIDED,
                'available'   => true,
                'maxMentees'  => 4,
                'specialties' => ['PHP', 'Symfony', 'JavaScript'],
                'rating'      => 4.5,
                'sessions'    => 12,
                'reliability' => 0.92,
            ],
            [
                'ref'         => 'user_1',
                'bio'         => 'Expert React/Next.js. J\'enseigne de façon directe avec des exemples tirés de projets réels.',
                'style'       => TeachingStyle::DIRECT,
                'available'   => true,
                'maxMentees'  => 3,
                'specialties' => ['React', 'Next.js', 'TypeScript'],
                'rating'      => 4.2,
                'sessions'    => 8,
                'reliability' => 0.88,
            ],
            [
                'ref'         => 'user_2',
                'bio'         => 'Passionnée par Python et les données. J\'aime poser les bonnes questions pour que tu trouves toi-même la solution.',
                'style'       => TeachingStyle::SOCRATIC,
                'available'   => true,
                'maxMentees'  => 3,
                'specialties' => ['Python', 'Flask', 'PostgreSQL'],
                'rating'      => 4.8,
                'sessions'    => 20,
                'reliability' => 0.95,
            ],
            [
                'ref'         => 'user_3',
                'bio'         => 'Spécialisé backend Java/Spring. Je préfère collaborer côte à côte en mob programming.',
                'style'       => TeachingStyle::COLLABORATIVE,
                'available'   => false, // Non disponible — pour tester ce cas dans le cockpit
                'maxMentees'  => 2,
                'specialties' => ['Java', 'Spring Boot', 'Docker'],
                'rating'      => 3.9,
                'sessions'    => 5,
                'reliability' => 0.80,
            ],
            [
                'ref'         => 'user_4',
                'bio'         => 'Fullstack JS de bout en bout. Je t\'accompagne de l\'idée jusqu\'au déploiement.',
                'style'       => TeachingStyle::DIRECT,
                'available'   => true,
                'maxMentees'  => 3,
                'specialties' => ['JavaScript', 'Node.js', 'MongoDB'],
                'rating'      => 4.0,
                'sessions'    => 3,
                'reliability' => 0.75,
            ],
        ];

        $mentorProfiles = [];
        foreach ($mentorConfigs as $i => $cfg) {
            $user = $this->getReference($cfg['ref'], User::class);
            $profile = new MentorProfile();
            $profile->setUser($user)
                ->setMentorBio($cfg['bio'])
                ->setTeachingStyle($cfg['style'])
                ->setIsAvailable($cfg['available'])
                ->setMaxActiveMentees($cfg['maxMentees'])
                ->setAverageRating($cfg['rating'])
                ->setTotalSessions($cfg['sessions'])
                ->setReliabilityRate($cfg['reliability']);

            foreach ($cfg['specialties'] as $skillName) {
                $s = $skill($skillName);
                if ($s !== null) {
                    $profile->addSpecialty($s);
                }
            }

            $manager->persist($profile);
            $mentorProfiles[$i] = $profile;
            $this->addReference('mentor_profile_' . $i, $profile);
        }

        $manager->flush();

        // ─── 2. DEMANDES EN ATTENTE (visibles dans le cockpit) ────────────
        //   Juniors : users 5-9
        $pendingConfigs = [
            [
                'junior'       => 'user_5',
                'type'         => MentoringRequestType::DEBUG,
                'title'        => 'Erreur 500 sur mon endpoint Symfony POST',
                'techStack'    => 'Symfony',
                'description'  => 'Mon controller retourne une 500 sans message clair dans les logs. J\'ai suspecté un problème d\'injection de service mais je n\'en suis pas sûr.',
                'blockedSince' => 'Hier soir',
                'alreadyTried' => 'Dumper le service, vérifier services.yaml',
            ],
            [
                'junior'      => 'user_6',
                'type'        => MentoringRequestType::CODE_REVIEW,
                'title'       => 'Review de mon composant React avec hooks',
                'techStack'   => 'React',
                'description' => 'J\'ai refactorisé un composant class vers des hooks fonctionnels. J\'aimerais un retour sur ma gestion des effets de bord et des dépendances.',
            ],
            [
                'junior'       => 'user_7',
                'type'         => MentoringRequestType::EXERCISE,
                'title'        => 'Comprendre les générateurs Python',
                'techStack'    => 'Python',
                'description'  => 'Je n\'arrive pas à saisir quand utiliser yield vs return dans un contexte de pipeline de données.',
                'blockedSince' => '3 jours',
            ],
            [
                'junior'       => 'user_8',
                'type'         => MentoringRequestType::DEBUG,
                'title'        => 'useEffect qui se déclenche en boucle infinie',
                'techStack'    => 'React',
                'description'  => 'Mon useEffect appelle une API et met à jour le state, ce qui retriggere l\'effet. Je ne comprends pas comment casser le cycle.',
                'alreadyTried' => 'Mettre un tableau de dépendances vide, mais ça casse la logique',
            ],
            [
                'junior'      => 'user_9',
                'type'        => MentoringRequestType::ONE_TO_ONE,
                'title'       => 'Session découverte TypeScript pour un dev JS',
                'techStack'   => 'TypeScript',
                'description' => 'Je fais du JavaScript depuis 2 ans et j\'aimerais migrer vers TypeScript. J\'ai besoin qu\'on voie ensemble les bases et les pièges courants.',
            ],
        ];

        $pendingRequests = [];
        foreach ($pendingConfigs as $cfg) {
            $req = new MentoringRequest();
            $req->setJunior($this->getReference($cfg['junior'], User::class))
                ->setType($cfg['type'])
                ->setTitle($cfg['title'])
                ->setTechStack($cfg['techStack'])
                ->setDescription($cfg['description'])
                ->setIsPublic(true)
                ->setStatus(MentoringRequestStatus::PENDING);

            if (isset($cfg['blockedSince'])) {
                $req->setBlockedSince($cfg['blockedSince']);
            }
            if (isset($cfg['alreadyTried'])) {
                $req->setAlreadyTried($cfg['alreadyTried']);
            }

            $manager->persist($req);
            $pendingRequests[] = $req;
        }

        $manager->flush();

        // ─── 3. PIN actif (mentor 0 épingle la 1re demande) ──────────────
        $pin = new MentoringPin();
        $pin->setMentor($mentorProfiles[0])
            ->setRequest($pendingRequests[0])
            ->setIsActive(true);
        $manager->persist($pin);

        // ─── 4. SESSIONS (SCHEDULED, IN_PROGRESS, COMPLETED ×2) ──────────
        $sessionsData = [
            // ── Planifiée (dans 2 jours) ──
            [
                'junior'     => 'user_5',
                'mentorIdx'  => 0,
                'type'       => MentoringRequestType::DEBUG,
                'title'      => 'Problème de migration Doctrine en prod',
                'techStack'  => 'PHP',
                'description'=> 'Ma migration échoue sur un ALTER TABLE en prod mais pas en local.',
                'format'     => SessionFormat::TEXT,
                'status'     => MentoringSessionStatus::SCHEDULED,
                'scheduledAt'=> (clone $now)->modify('+2 days'),
            ],
            // ── En cours ──
            [
                'junior'     => 'user_6',
                'mentorIdx'  => 1,
                'type'       => MentoringRequestType::ONE_TO_ONE,
                'title'      => 'Introduction au App Router Next.js',
                'techStack'  => 'Next.js',
                'description'=> 'Comprendre la différence entre server components et client components.',
                'format'     => SessionFormat::VIDEO,
                'status'     => MentoringSessionStatus::IN_PROGRESS,
                'startedAt'  => (clone $now)->modify('-30 minutes'),
            ],
            // ── Terminée avec notes ──
            [
                'junior'     => 'user_7',
                'mentorIdx'  => 2,
                'type'       => MentoringRequestType::EXERCISE,
                'title'      => 'Exercice list comprehensions Python',
                'techStack'  => 'Python',
                'description'=> 'Pratiquer les list comprehensions et les expressions génératrices.',
                'format'     => SessionFormat::TEXT,
                'status'     => MentoringSessionStatus::COMPLETED,
                'startedAt'  => (clone $now)->modify('-5 days'),
                'completedAt'=> (clone $now)->modify('-5 days +1 hour'),
                'ratingJunior' => ['score' => 5, 'comment' => 'Très pédagogue, j\'ai tout compris !'],
                'ratingMentor' => ['score' => 4, 'comment' => 'Junior motivé et curieux, bonne progression.'],
            ],
            // ── Terminée avec notes ──
            [
                'junior'     => 'user_8',
                'mentorIdx'  => 1,
                'type'       => MentoringRequestType::DEBUG,
                'title'      => 'Debug dépendances useEffect — boucle infinie',
                'techStack'  => 'React',
                'description'=> 'Comprendre les dépendances useEffect et corriger une boucle infinie.',
                'format'     => SessionFormat::HYBRID,
                'status'     => MentoringSessionStatus::COMPLETED,
                'startedAt'  => (clone $now)->modify('-10 days'),
                'completedAt'=> (clone $now)->modify('-10 days +45 minutes'),
                'ratingJunior' => ['score' => 4, 'comment' => 'Explications très claires, merci !'],
                'ratingMentor' => ['score' => 5, 'comment' => 'Super junior, très impliqué et réactif.'],
            ],
        ];

        foreach ($sessionsData as $data) {
            $junior = $this->getReference($data['junior'], User::class);
            $mentorProfile = $mentorProfiles[$data['mentorIdx']];

            // Demande ACCEPTED associée à la session
            $req = new MentoringRequest();
            $req->setJunior($junior)
                ->setType($data['type'])
                ->setTitle($data['title'])
                ->setTechStack($data['techStack'])
                ->setDescription($data['description'])
                ->setIsPublic(false)
                ->setStatus(MentoringRequestStatus::ACCEPTED);
            $manager->persist($req);

            // Session
            $session = new MentoringSession();
            $session->setMentor($mentorProfile)
                ->setJunior($junior)
                ->setRequest($req)
                ->setFormat($data['format'])
                ->setStatus($data['status']);

            if (isset($data['scheduledAt'])) {
                $session->setScheduledAt($data['scheduledAt']);
            }
            if (isset($data['startedAt'])) {
                $session->setStartedAt($data['startedAt']);
            }
            if (isset($data['completedAt'])) {
                $session->setCompletedAt($data['completedAt']);
            }

            $manager->persist($session);
            $manager->flush(); // nécessaire avant de créer les ratings (FK session)

            // Notes (uniquement pour les sessions terminées)
            if (isset($data['ratingJunior'])) {
                $rJunior = new MentoringRating();
                $rJunior->setSession($session)
                    ->setRater($junior)
                    ->setRatee($mentorProfile->getUser())
                    ->setScore($data['ratingJunior']['score'])
                    ->setComment($data['ratingJunior']['comment'])
                    ->setSubmittedAt(new \DateTime())
                    ->setIsVisible(true);
                $manager->persist($rJunior);

                $rMentor = new MentoringRating();
                $rMentor->setSession($session)
                    ->setRater($mentorProfile->getUser())
                    ->setRatee($junior)
                    ->setScore($data['ratingMentor']['score'])
                    ->setComment($data['ratingMentor']['comment'])
                    ->setSubmittedAt(new \DateTime())
                    ->setIsVisible(true);
                $manager->persist($rMentor);
            }
        }

        $manager->flush();

        echo "✅ Fixtures mentorat : 5 profils mentors, 5 demandes en attente, 1 pin actif, 4 sessions (1 planifiée, 1 en cours, 2 terminées avec notes)\n";
    }
}
