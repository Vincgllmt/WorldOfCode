<?php

namespace App\Entity;

use App\Enum\UserRole;
use App\Enum\Availability;
use App\Entity\Experience;
use App\Entity\TechGroup;
use App\Entity\Skill;
use App\Entity\UserLink;
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

    #[ORM\Column(length: 100)]
    private string $firstname;

    #[ORM\Column(length: 100)]
    private string $lastname;

    #[ORM\Column(length: 255, unique: true)]
    private string $email;


    #[ORM\Column(type: "string", enumType: UserRole::class)]
    private UserRole $role = UserRole::ROLE_USER;

    #[ORM\Column(name: "creation_date", type: "datetime")]
    private \DateTime $creationDate;

    #[ORM\Column(name: "updated_date", type: "datetime")]
    private \DateTime $updatedDate;

    #[ORM\OneToMany(targetEntity: Post::class, mappedBy: "author", orphanRemoval: true)]
    private Collection $posts;

    #[ORM\OneToMany(targetEntity: Comment::class, mappedBy: "author", orphanRemoval: true)]
    private Collection $comments;

    #[ORM\OneToMany(targetEntity: TechGroup::class, mappedBy: "creator")]
    private Collection $groups;

    #[ORM\ManyToMany(targetEntity: TechGroup::class, mappedBy: 'users')]
    private Collection $joinedGroups;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $resetToken = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $resetTokenExpiresAt = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $twoFactorCode = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $twoFactorExpiresAt = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $theme = null;

    // --- Nouveaux champs profil CV ---

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $location = null;

    #[ORM\Column(type: 'string', nullable: true, enumType: Availability::class)]
    private ?Availability $availability = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $experiences = null;

    #[ORM\Column(name: 'field_visibility', type: 'json', nullable: true)]
    private ?array $fieldVisibility = null;

    #[ORM\Column(length: 36, nullable: true, unique: true)]
    private ?string $cvPublicToken = null;

    #[ORM\Column(length: 30, nullable: true, options: ['default' => 'sidebar-left'])]
    private ?string $cvLayout = 'sidebar-left';

    #[ORM\Column(length: 7, nullable: true)]
    private ?string $cvAccentColor = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $isBanned = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $bannedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bannedReason = null;

    #[ORM\ManyToMany(targetEntity: Skill::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'user_skill')]
    private Collection $skills;

    #[ORM\OneToMany(targetEntity: UserLink::class, mappedBy: 'user', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $links;

    #[ORM\OneToMany(targetEntity: Experience::class, mappedBy: 'user', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $experienceEntities;


    public function __construct()
    {
        $this->posts = new ArrayCollection();
        $this->comments = new ArrayCollection();
        $this->groups = new ArrayCollection();
        $this->joinedGroups = new ArrayCollection();
        $this->skills = new ArrayCollection();
        $this->links = new ArrayCollection();
        $this->experienceEntities = new ArrayCollection();
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



    #[\Deprecated]
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


    public function getFirstname(): string
    {
        return $this->firstname;
    }

    public function setFirstname(string $firstname): self
    {
        $this->firstname = $firstname;
        return $this;
    }

    public function getLastname(): string
    {
        return $this->lastname;
    }

    public function setLastname(string $lastname): self
    {
        $this->lastname = $lastname;
        return $this;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function setResetToken(?string $resetToken): self
    {
        $this->resetToken = $resetToken;
        return $this;
    }

    public function getResetTokenExpiresAt(): ?\DateTimeInterface
    {
        return $this->resetTokenExpiresAt;
    }

    public function setResetTokenExpiresAt(?\DateTimeInterface $resetTokenExpiresAt): self
    {
        $this->resetTokenExpiresAt = $resetTokenExpiresAt;
        return $this;
    }

    public function getTwoFactorCode(): ?string
    {
        return $this->twoFactorCode;
    }

    public function setTwoFactorCode(?string $twoFactorCode): self
    {
        $this->twoFactorCode = $twoFactorCode;
        return $this;
    }

    public function getTwoFactorExpiresAt(): ?\DateTimeInterface
    {
        return $this->twoFactorExpiresAt;
    }

    public function setTwoFactorExpiresAt(?\DateTimeInterface $twoFactorExpiresAt): self
    {
        $this->twoFactorExpiresAt = $twoFactorExpiresAt;
        return $this;
    }

    public function getTheme(): ?string
    {
        return $this->theme;
    }

    public function setTheme(?string $theme): self
    {
        $this->theme = $theme;
        return $this;
    }

    // --- Nouveaux getters/setters profil CV ---

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function setBio(?string $bio): self
    {
        $this->bio = $bio;
        return $this;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }

    public function setLocation(?string $location): self
    {
        $this->location = $location;
        return $this;
    }

    public function getAvailability(): ?Availability
    {
        return $this->availability;
    }

    public function setAvailability(?Availability $availability): self
    {
        $this->availability = $availability;
        return $this;
    }

    public function getExperiences(): ?array
    {
        return $this->experiences;
    }

    public function setExperiences(?array $experiences): self
    {
        $this->experiences = $experiences;
        return $this;
    }

    public function getFieldVisibility(): ?array
    {
        return $this->fieldVisibility;
    }

    public function setFieldVisibility(array $fieldVisibility): self
    {
        $this->fieldVisibility = $fieldVisibility;
        return $this;
    }

    public function getCvPublicToken(): ?string
    {
        return $this->cvPublicToken;
    }

    public function setCvPublicToken(?string $cvPublicToken): self
    {
        $this->cvPublicToken = $cvPublicToken;
        return $this;
    }

    public function getCvLayout(): string
    {
        return $this->cvLayout ?? 'sidebar-left';
    }

    public function setCvLayout(?string $cvLayout): self
    {
        $this->cvLayout = $cvLayout;
        return $this;
    }

    public function getCvAccentColor(): ?string
    {
        return $this->cvAccentColor;
    }

    public function setCvAccentColor(?string $cvAccentColor): self
    {
        $this->cvAccentColor = $cvAccentColor;
        return $this;
    }

    public function getEffectiveFieldVisibility(): array
    {
        $defaults = [
            'bio'          => 'PUBLIC',
            'location'     => 'PUBLIC',
            'availability' => 'PUBLIC',
            'email'        => 'PRIVATE',
        ];
        if ($this->fieldVisibility === null) {
            return $defaults;
        }
        return array_merge($defaults, $this->fieldVisibility);
    }

    public function getSkills(): Collection
    {
        return $this->skills;
    }

    public function addSkill(Skill $skill): self
    {
        if (!$this->skills->contains($skill)) {
            $this->skills[] = $skill;
        }
        return $this;
    }

    public function removeSkill(Skill $skill): self
    {
        $this->skills->removeElement($skill);
        return $this;
    }

    public function getLinks(): Collection
    {
        return $this->links;
    }

    public function addLink(UserLink $link): self
    {
        if (!$this->links->contains($link)) {
            $this->links[] = $link;
            $link->setUser($this);
        }
        return $this;
    }

    public function removeLink(UserLink $link): self
    {
        if ($this->links->removeElement($link)) {
            // orphanRemoval handles deletion
        }
        return $this;
    }

    public function getExperienceEntities(): Collection
    {
        return $this->experienceEntities;
    }

    public function addExperienceEntity(Experience $experience): self
    {
        if (!$this->experienceEntities->contains($experience)) {
            $this->experienceEntities[] = $experience;
            $experience->setUser($this);
        }
        return $this;
    }

    public function removeExperienceEntity(Experience $experience): self
    {
        $this->experienceEntities->removeElement($experience);
        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): self
    {
        $this->avatarUrl = $avatarUrl;
        return $this;
    }

    public function isBanned(): bool
    {
        return $this->isBanned;
    }

    public function setIsBanned(bool $isBanned): self
    {
        $this->isBanned = $isBanned;
        return $this;
    }

    public function getBannedAt(): ?\DateTimeInterface
    {
        return $this->bannedAt;
    }

    public function setBannedAt(?\DateTimeInterface $bannedAt): self
    {
        $this->bannedAt = $bannedAt;
        return $this;
    }

    public function getBannedReason(): ?string
    {
        return $this->bannedReason;
    }

    public function setBannedReason(?string $bannedReason): self
    {
        $this->bannedReason = $bannedReason;
        return $this;
    }
}
