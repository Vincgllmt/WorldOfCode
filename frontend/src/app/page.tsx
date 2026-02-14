'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Code, Users, MessageCircle, Video } from 'lucide-react'

const slides = [
    {
        icon: <Code className="w-10 h-10 text-green-600" />,
        title: "Fil d'actualit\u00e9",
        description: "Partagez vos connaissances, postez du code et \u00e9changez avec la communaut\u00e9 des d\u00e9veloppeurs."
    },
    {
        icon: <Users className="w-10 h-10 text-green-600" />,
        title: "Groupes technologiques",
        description: "Rejoignez des groupes React, Symfony, Docker, AWS et bien d'autres pour approfondir vos comp\u00e9tences."
    },
    {
        icon: <MessageCircle className="w-10 h-10 text-green-600" />,
        title: "Messagerie temps r\u00e9el",
        description: "Discutez en priv\u00e9 avec les autres d\u00e9veloppeurs instantan\u00e9ment gr\u00e2ce \u00e0 notre messagerie int\u00e9gr\u00e9e."
    },
    {
        icon: <Video className="w-10 h-10 text-green-600" />,
        title: "Appels vid\u00e9o & partage d'\u00e9cran",
        description: "Collaborez en live avec la vid\u00e9o et le partage d'\u00e9cran pour r\u00e9soudre des probl\u00e8mes ensemble."
    },
]

export default function LandingPage() {
    const [current, setCurrent] = useState(0)

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % slides.length)
    }, [])

    const prev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
    }, [])

    // Auto-scroll toutes les 5 secondes
    useEffect(() => {
        const interval = setInterval(next, 5000)
        return () => clearInterval(interval)
    }, [next])

    return (
        <div className="h-screen flex flex-col bg-gradient-to-b from-green-400 via-green-200 to-white overflow-hidden">
            {/* Navbar Landing */}
            <nav className="bg-green-50/80 backdrop-blur-md border-b border-green-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/">
                        <Image
                            src="/logo2.png"
                            alt="World of Code"
                            width={160}
                            height={50}
                            className="h-12 w-auto"
                        />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="outline" size="sm">Se connecter</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">S&apos;inscrire</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Contenu principal - prend tout l'espace restant */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 gap-8">
                {/* Logo + accroche */}
                <div className="text-center">
                    <Image
                        src="/logo-woc.png"
                        alt="World of Code"
                        width={150}
                        height={150}
                        className="mx-auto mb-4"
                        priority
                    />
                    <p className="text-gray-600 text-lg max-w-xl mx-auto mb-6">
                        Connectez-vous, apprenez, collaborez et partagez vos connaissances
                        avec une communaut&eacute; de passionn&eacute;s de programmation.
                    </p>
                    <Link href="/register">
                        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-lg px-8">
                            Rejoindre la communaut&eacute;
                        </Button>
                    </Link>
                </div>

                {/* Carrousel */}
                <div className="w-full max-w-2xl relative">
                    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-green-100 p-6 sm:p-8 text-center min-h-[180px] flex flex-col items-center justify-center">
                        <div className="mb-3 bg-green-50 rounded-full p-3 inline-flex">
                            {slides[current].icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                            {slides[current].title}
                        </h3>
                        <p className="text-gray-600 text-sm sm:text-base max-w-lg">
                            {slides[current].description}
                        </p>
                    </div>

                    {/* Fl\u00e8ches */}
                    <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-colors border border-green-100"
                        aria-label="Slide pr\u00e9c\u00e9dente"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-colors border border-green-100"
                        aria-label="Slide suivante"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-4">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrent(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === current
                                        ? 'bg-green-600 w-6'
                                        : 'bg-green-200 hover:bg-green-300'
                                }`}
                                aria-label={`Aller au slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
