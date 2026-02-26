# MyJantes - Application Mobile

## Overview
Application mobile Expo React Native pour MyJantes, un service professionnel de rénovation et personnalisation de jantes automobiles. L'app permet aux particuliers et professionnels de demander des devis gratuits en ligne.

## Architecture
- **Frontend**: Expo React Native (Expo Router, file-based routing)
- **Backend**: API externe hébergée sur `appmyjantes5.mytoolsgroup.eu`
- **Auth**: Sessions avec cookies (stockés via expo-secure-store / AsyncStorage)
- **State**: React Query pour les données serveur, React Context pour l'auth

## API Backend
Base URL: Configurable via `EXTERNAL_API_URL` env var (default: `https://MyJantesv6.replit.app`)

### Endpoints principaux
- `POST /api/register` - Inscription (email, password, firstName, lastName, role, etc.)
- `POST /api/login` - Connexion (email, password) → retourne user + cookie session
- `POST /api/logout` - Déconnexion
- `GET /api/auth/user` - Profil utilisateur authentifié
- `GET /api/services` - Liste des services (auth requise)
- `GET /api/quotes` - Liste des devis de l'utilisateur (auth requise)
- `POST /api/quotes` - Créer une demande de devis
- `POST /api/upload` - Upload de fichiers (multipart/form-data, field "media")
- `POST /api/support/contact` - Formulaire de contact
- `DELETE /api/users/me` - Suppression permanente du compte utilisateur

### Roles utilisateur
- `client` - Particulier
- `client_professionnel` - Professionnel (+ infos société)

## Structure du projet
```
app/
  _layout.tsx           # Root layout (providers, fonts)
  index.tsx             # Redirect basé sur auth
  (auth)/               # Flux d'authentification
    _layout.tsx
    login.tsx
    register.tsx
    forgot-password.tsx
  (main)/               # App principale (authentifié)
    _layout.tsx
    (tabs)/
      _layout.tsx       # Tab navigation
      index.tsx         # Accueil + liste services
      quotes.tsx        # Historique des devis
      invoices.tsx      # Historique des factures
      reservations.tsx  # Historique des réservations
      messages.tsx      # Conversations chat
      notifications.tsx # Centre de notifications
      profile.tsx       # Profil utilisateur (3 tabs: Infos, Sécurité, Notifications) + lien suppression compte
      more.tsx          # Menu: support, mentions légales, confidentialité
    new-quote.tsx       # Formulaire nouveau devis
    quote-detail.tsx    # Détail d'un devis
    invoice-detail.tsx  # Détail d'une facture
    reservation-detail.tsx # Détail d'une réservation
    chat-detail.tsx     # Conversation chat
    delete-account.tsx  # Suppression permanente du compte (Apple 5.1.1(v))
  support.tsx           # Formulaire de support
  legal.tsx             # Mentions légales
  privacy.tsx           # Politique de confidentialité
components/
  FloatingSupport.tsx   # Bouton flottant support
  ErrorBoundary.tsx     # Error boundary
  CustomAlert.tsx       # Alerte personnalisée glassmorphism
lib/
  api.ts                # Client API complet
  auth-context.tsx      # Context d'authentification + biométrie
  query-client.ts       # React Query config
constants/
  colors.ts             # Thème sombre (noir/rouge/blanc)
server/
  routes.ts             # Proxy API vers backend externe
  index.ts              # Express server (port 5000)
```

## User Preferences
- Language: Français
- Interface entièrement en français
- Design professionnel automobile (thème sombre: noir #0A0A0A, rouge #DC2626, blanc)
- Font: Inter (Google Fonts)
- Logo: cropped-Logo-2-1-768x543 intégré dans l'app

## Key Technical Notes
- No AI functionality in mobile app (Apple 5.1.1(v) compliance)
- No admin-only screens or role-based UI in mobile app
- Account deletion available via Profile → Paramètres → Supprimer mon compte
- Detail pages use client API endpoints only
- Biometric auth auto-clears expired session credentials
- API_BASE for detail pages uses `EXPO_PUBLIC_API_URL` env var with fallback to default

## Apple App Store Compliance (5.1.1(v))
- All AI screens, services, and imports removed (chatbot, OCR scanner)
- All admin-only screens removed (20 admin screens deleted)
- No role-based conditional UI remains in mobile
- Account deletion implemented: DELETE /api/users/me
- No third-party AI data sharing from mobile app

## Recent Changes
- Feb 2026: Initial build of MyJantes mobile app
- Feb 2026: Thème sombre complet (noir/rouge/blanc)
- Feb 2026: Push notifications, biometric auth
- Feb 25 2026: Apple 5.1.1(v) compliance: removed all AI features, admin screens, role-based UI; added permanent account deletion
