import '@testing-library/jest-dom'

// Clé Stripe factice pour les tests des composants de don (aucune requête réseau réelle).
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||= 'pk_test_dummy_for_jest'
