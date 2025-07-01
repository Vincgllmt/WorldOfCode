<?php

namespace App\Entity;

use App\Enum\UserRole;
use App\Entity\TechGroup;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: UserRepository::class)]



class User implements UserInterface, PasswordAuthenticatedUserInterface

{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    private string $username;

    #[ORM\Column(length: 255)]
    private string $password;

    #[ORM\Column(type: "string", enumType: UserRole::class)]
    private UserRole $role = UserRole::ROLE_USER;

    #[ORM\Column(name: "creation_date", type: "datetime")]
    private \DateTime $creationDate;

    #[ORM\Column(name: "updated_date", type: "datetime")]
    private \DateTime $updatedDate;

    #[ORM\OneToMany(mappedBy: "author", targetEntity: Post::class, orphanRemoval: true)]
    private Collection $posts;

    #[ORM\OneToMany(mappedBy: "author", targetEntity: Comment::class, orphanRemoval: true)]
    private Collection $comments;

    #[ORM\OneToMany(mappedBy: "creator", targetEntity: TechGroup::class)]
    private Collection $groups;

    #[ORM\ManyToMany(targetEntity: TechGroup::class, mappedBy: 'users')]
    private Collection $joinedGroups;

    public function __construct()
    {
        $this->posts = new ArrayCollection();
        $this->comments = new ArrayCollection();
        $this->groups = new ArrayCollection();
        $this->joinedGroups = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->creationDate = new \DateTime();
        $this->updatedDate = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onUpdate(): void
    {
        $this->updatedDate = new \DateTime();
    }

    // Getters et setters

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    public function getRole(): UserRole
    {
        return $this->role;
    }

    public function setRole(UserRole $role): self
    {
        $this->role = $role;
        return $this;
    }

    public function getCreationDate(): \DateTime
    {
        return $this->creationDate;
    }

    public function getUpdatedDate(): \DateTime
    {
        return $this->updatedDate;
    }

    public function getRoles(): array
    {
        return [$this->role->value];
    }



    public function eraseCredentials(): void {}

    public function getUserIdentifier(): string
    {
        return $this->username;
    }


    public function getPosts(): Collection
    {
        return $this->posts;
    }

    public function getComments(): Collection
    {
        return $this->comments;
    }

    public function getGroups(): Collection
    {
        return $this->groups;
    }
    public function addGroup(TechGroup $group): self
    {
        if (!$this->groups->contains($group)) {
            $this->groups[] = $group;
            $group->addUser($this);
        }

        return $this;
    }

    public function removeGroup(TechGroup $group): self
    {
        if ($this->groups->contains($group)) {
            $this->groups->removeElement($group);
            $group->removeUser($this);
        }

        return $this;
    }

    public function getJoinedGroups(): Collection
    {
        return $this->joinedGroups;
    }

    public function addJoinedGroup(TechGroup $group): self
    {
        if (!$this->joinedGroups->contains($group)) {
            $this->joinedGroups[] = $group;
            $group->addUser($this);
        }

        return $this;
    }

    public function removeJoinedGroup(TechGroup $group): self
    {
        if ($this->joinedGroups->contains($group)) {
            $this->joinedGroups->removeElement($group);
            $group->removeUser($this);
        }

        return $this;
    }
}
