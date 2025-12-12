<?php

namespace App\DataFixtures;

use App\Entity\Post;
use App\Entity\Comment;
use App\Entity\Like;
use App\Entity\Report;
use App\Entity\User;
use App\Entity\TechGroup;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;

class PostFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // Récupération des utilisateurs
        $users = [];
        for ($i = 0; $i < 50; $i++) {
            $users[] = $this->getReference('user_' . $i, User::class);
        }

        // Groupes tech
        $groupNames = [
            'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Django', 'Symfony', 'Laravel',
            'Docker', 'Kubernetes', 'AWS', 'DevOps', 'Machine Learning', 'Cybersécurité',
            'Blockchain', 'Mobile Dev', 'UI/UX Design', 'PostgreSQL', 'MongoDB', 'GraphQL',
            'TypeScript', 'Rust', 'Go', 'Next.js', 'Tailwind CSS'
        ];

        $groups = [];
        foreach ($groupNames as $name) {
            $groups[] = $this->getReference('group_' . $name, TechGroup::class);
        }

        // Contenus variés et réalistes
        $postTemplates = [
            "🚀 Venez de déployer mon premier projet en production avec %s ! L'expérience est vraiment géniale. Les performances sont au rendez-vous et l'écosystème est très riche.",
            "💡 Astuce du jour : Saviez-vous que %s propose cette fonctionnalité méconnue qui peut vous faire gagner des heures ? Je viens de la découvrir et c'est un game changer !",
            "🤔 Question pour la communauté : Comment gérez-vous la scalabilité avec %s ? J'ai un projet qui commence à grossir et je cherche les meilleures pratiques.",
            "📚 Je viens de publier un article sur mon blog concernant %s. J'y partage mes 2 ans d'expérience en production. N'hésitez pas à me faire vos retours !",
            "🎉 Excellente nouvelle ! La nouvelle version majeure de %s vient de sortir avec des fonctionnalités incroyables. Qui a déjà testé ?",
            "⚠️ Attention : j'ai rencontré un bug critique avec %s dans cette configuration. Voici le workaround en attendant le fix officiel...",
            "🔥 Mon top 5 des librairies indispensables pour %s. Ces outils m'ont fait gagner un temps fou sur mes derniers projets !",
            "💻 Open source : Je viens de publier un nouveau package pour %s. Contributions et feedbacks sont les bienvenus !",
            "🎯 Retour d'expérience : Migration vers %s terminée ! Voici les challenges rencontrés et comment nous les avons surmontés.",
            "🏆 Après 6 mois d'apprentissage intensif de %s, je me sens enfin à l'aise. Mes conseils pour les débutants...",
            "🤝 Je cherche des contributeurs pour un projet open source basé sur %s. Qui est motivé pour rejoindre l'aventure ?",
            "📊 Benchmark de performance : %s vs les alternatives. Les résultats sont surprenants !",
            "🎨 Check out ce composant réutilisable que j'ai créé avec %s. Clean, performant et bien documenté.",
            "🐛 Debug du jour : Passé 3h sur ce bug avec %s. La solution était si simple... Voici ce que j'ai appris.",
            "🌟 Pourquoi j'ai choisi %s pour mon dernier projet et pourquoi je ne regrette pas ce choix.",
        ];

        $posts = [];

        // Créer des posts pour chaque groupe
        foreach ($groups as $group) {
            $postCount = rand(8, 20);
            $groupName = $group->getName();

            for ($i = 0; $i < $postCount; $i++) {
                $post = new Post();
                $template = $postTemplates[array_rand($postTemplates)];
                $content = sprintf($template, $groupName);

                // Ajouter parfois plus de détails
                if (rand(0, 10) > 6) {
                    $additionalContent = [
                        "\n\nVoici les points clés à retenir :\n• Point important 1\n• Point important 2\n• Point important 3",
                        "\n\nJe détaille tout ça dans le thread ci-dessous 🧵",
                        "\n\n#dev #coding #tech #programming",
                        "\n\nN'hésitez pas à me poser vos questions, je réponds avec plaisir !",
                        "\n\nQu'en pensez-vous ? Avez-vous eu des expériences similaires ?",
                    ];
                    $content .= $additionalContent[array_rand($additionalContent)];
                }

                $post->setContent($content);
                $post->setAuthor($users[array_rand($users)]);
                $post->setTechGroup($group);

                $manager->persist($post);
                $posts[] = $post;
            }
        }

        $manager->flush();

        // Créer des posts partagés (certains posts partagent d'autres posts)
        $sharedPostsCount = min(15, count($posts));
        for ($i = 0; $i < $sharedPostsCount; $i++) {
            $originalPost = $posts[array_rand($posts)];
            $sharePost = new Post();

            $shareMessages = [
                "💯 Totalement d'accord avec ce post !",
                "👀 À lire absolument !",
                "🔄 Important à partager avec la communauté",
                "📢 Super ressource à ne pas manquer",
                "💪 Exactement ce dont on avait besoin",
            ];

            $sharePost->setContent($shareMessages[array_rand($shareMessages)]);
            $sharePost->setAuthor($users[array_rand($users)]);
            $sharePost->setTechGroup($originalPost->getTechGroup());
            $sharePost->setSharedFrom($originalPost);

            $manager->persist($sharePost);
            $posts[] = $sharePost;
        }

        $manager->flush();

        // Ajouter des likes (chaque post reçoit entre 0 et 25 likes)
        foreach ($posts as $post) {
            $likeCount = rand(0, 25);

            if ($likeCount === 0) {
                continue;
            }

            $likeCount = min($likeCount, count($users));

            if ($likeCount === 1) {
                $likedByUsers = [array_rand($users)];
            } else {
                $likedByUsers = array_rand($users, $likeCount);
                if (!is_array($likedByUsers)) {
                    $likedByUsers = [$likedByUsers];
                }
            }

            foreach ($likedByUsers as $userIndex) {
                $like = new Like();
                $like->setUser($users[$userIndex]);
                $like->setPost($post);
                $manager->persist($like);
            }
        }

        $manager->flush();

        // Ajouter des commentaires variés
        $commentTemplates = [
            "Excellent post ! Merci pour le partage 👍",
            "Super intéressant, j'ai appris quelque chose aujourd'hui !",
            "Complètement d'accord avec ton approche. J'utilise la même sur mes projets.",
            "Merci pour cette ressource, exactement ce que je cherchais !",
            "J'ai eu le même problème la semaine dernière. Voici comment je l'ai résolu : %s",
            "Bonne idée, je vais tester ça sur mon prochain projet 🚀",
            "Question : comment tu gères la partie %s dans ce cas ?",
            "Génial ! Je cherchais exactement cette solution depuis des jours.",
            "Tu devrais regarder cette alternative, elle pourrait mieux correspondre.",
            "Attention aux performances avec cette approche, j'ai eu des soucis en prod.",
            "Merci ! Ça va me faire gagner un temps fou 💪",
            "Très bon article, bien expliqué et super clair.",
            "Je recommande aussi de jeter un œil à la doc officielle sur ce point.",
            "Est-ce que c'est compatible avec la dernière version ?",
            "Bravo pour ce travail ! C'est vraiment utile pour la communauté.",
            "Petite correction : il manque un point important concernant %s",
            "J'ai forké ton repo, j'ai ajouté quelques améliorations 💻",
            "Quelqu'un a testé en environnement de production ?",
            "Cette approche est vraiment élégante 🎯",
            "Merci pour le partage, ça m'a sauvé la journée !",
        ];

        foreach ($posts as $post) {
            $commentCount = rand(1, 12);

            for ($i = 0; $i < $commentCount; $i++) {
                $comment = new Comment();
                $template = $commentTemplates[array_rand($commentTemplates)];

                // Remplacer %s si présent
                if (strpos($template, '%s') !== false) {
                    $topics = ['sécurité', 'performance', 'tests', 'déploiement', 'configuration'];
                    $template = sprintf($template, $topics[array_rand($topics)]);
                }

                $comment->setContent($template);
                $comment->setAuthor($users[array_rand($users)]);
                $comment->setPost($post);

                $manager->persist($comment);
            }
        }

        $manager->flush();

        // Ajouter quelques rapports sur des posts aléatoires
        $reportReasons = [
            'Spam ou contenu promotionnel',
            'Contenu offensant ou harcèlement',
            'Informations fausses ou trompeuses',
            'Violation de droits d\'auteur',
            'Contenu inapproprié',
            'Hors sujet',
        ];

        $reportCount = min(20, count($posts));
        for ($i = 0; $i < $reportCount; $i++) {
            $post = $posts[array_rand($posts)];
            $user = $users[array_rand($users)];

            // Vérifier si ce user a déjà reporté ce post (contrainte unique)
            // On simplifie en créant directement
            $report = new Report();
            $report->setPost($post);
            $report->setUser($user);
            $report->setReason($reportReasons[array_rand($reportReasons)]);

            try {
                $manager->persist($report);
            } catch (\Exception $e) {
                // Ignore les doublons
            }
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            AppFixtures::class,
            GroupFixtures::class,
        ];
    }
}