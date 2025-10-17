<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class PasswordResetService
{
    private Mailer $mailer;
    private UserRepository $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $dsn = 'smtp://c604fad8c7693e:c01416259056a9@sandbox.smtp.mailtrap.io:2525';
        $transport = Transport::fromDsn($dsn);
        $this->mailer = new Mailer($transport);
        $this->userRepository = $userRepository;
    }
    public function requestReset(User $user): void
    {
        $token = Uuid::v4()->toRfc4122();
        $user->setResetToken($token);
        $this->userRepository->save($user);

        $resetLink = sprintf('https://localhost:3000/reset-password?token=%s', $token);

        $email = (new Email())
            ->from('no-reply@yourapp.com')
            ->to($user->getEmail())
            ->subject('Réinitialisation de votre mot de passe')
            ->html(sprintf(
                '<p>Bonjour %s,</p><p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p><p><a href="%s">%s</a></p>',
                $user->getFirstname(),
                $resetLink,
                $resetLink
            ));


        $this->mailer->send($email);
    }


    public function resetPassword(string $token, string $newPassword, UserPasswordHasherInterface $hasher): bool
    {
        $user = $this->userRepository->findOneBy(['resetToken' => $token]);

        if (!$user) {
            return false;
        }

        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $user->setResetToken(null);
        $this->userRepository->save($user);

        return true;
    }
}
