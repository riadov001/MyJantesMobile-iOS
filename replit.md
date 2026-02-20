# MyJantes - Application Mobile

## Overview
Application mobile Expo React Native pour MyJantes, un service professionnel de rénovation et personnalisation de jantes automobiles. L'app permet aux particuliers et professionnels de demander des devis gratuits en ligne.

## Architecture
- **Frontend**: Expo React Native (Expo Router, file-based routing)
- **Backend**: API externe hébergée sur `appmyjantes.mytoolsgroup.eu`
- **Auth**: Sessions avec cookies (stockés via expo-secure-store / AsyncStorage)
- **State**: React Query pour les données serveur, React Context pour l'auth

## API Backend
Base URL: `https://appmyjantes.mytoolsgroup.eu`

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
- `POST /api/ocr/scan` - OCR pour scanner des documents

### Roles utilisateur
- `client` - Particulier
- `client_professionnel` - Professionnel (+ infos société)
- `admin` - Administrateur (gestion complète)
- `super_admin` - Super administrateur (+ gestion garages)

### Endpoints Admin (auth admin/super_admin requise)
- Devis: `GET/PUT/DELETE /api/admin/quotes/:id`
- Factures: `GET/POST/PUT/DELETE /api/admin/invoices/:id`, `POST /api/admin/invoices/direct`
- Clients: `GET/POST/PUT/DELETE /api/admin/clients/:id`
- Services: `GET/POST/PUT/DELETE /api/admin/services/:id`
- Utilisateurs: `GET/PUT/DELETE /api/admin/users/:id`
- Réservations: `GET/POST/PUT/DELETE /api/admin/reservations/:id`
- Paiements: `GET /api/admin/payments`, `POST /api/admin/payment/generate-link`
- Analytics: `GET /api/admin/analytics`
- Paramètres: `GET/PUT /api/admin/settings`, `GET/PUT /api/admin/garage-legal`
- Comptabilité: profit-loss, tva-report, cash-flow, entries, fec-export
- Ordres de réparation: `GET/POST/PUT /api/admin/repair-orders/:id`
- Avoirs: `GET/POST /api/admin/credit-notes/:id`
- Bons de livraison: `GET/POST /api/admin/delivery-notes/:id`
- Dépenses: `GET/POST/PUT/DELETE /api/admin/expenses/:id`
- Avis: `GET/PUT/DELETE /api/admin/reviews/:id`
- Exports: `POST /api/admin/export-data`, `POST /api/admin/export-database`
- Logs audit: `GET /api/admin/audit-logs`
- Engagements: `GET/POST/PUT /api/admin/engagements/:id`
- Super Admin garages: `GET/POST/PUT/DELETE /api/superadmin/garages/:id`

## Structure du projet
```
app/
  _layout.tsx           # Root layout (providers, fonts)
  index.tsx             # Redirect basé sur auth
  (auth)/               # Flux d'authentification
    _layout.tsx
    login.tsx
    register.tsx
  (main)/               # App principale (authentifié)
    _layout.tsx
    (tabs)/
      _layout.tsx       # Tab navigation
      index.tsx         # Accueil + liste services
      quotes.tsx        # Historique des devis
      profile.tsx       # Profil utilisateur
      more.tsx          # Mentions légales, contact, etc.
    new-quote.tsx       # Formulaire nouveau devis
  support.tsx           # Formulaire de support (formSheet)
  legal.tsx             # Mentions légales
  privacy.tsx           # Politique de confidentialité
components/
  FloatingSupport.tsx   # Bouton flottant support
  ErrorBoundary.tsx     # Error boundary
lib/
  api.ts                # Client API
  auth-context.tsx      # Context d'authentification
  query-client.ts       # React Query config
```

## User Preferences
- Language: Français
- Interface entièrement en français
- Design professionnel automobile (thème sombre: noir #0A0A0A, rouge #DC2626, blanc)
- Font: Inter (Google Fonts)
- Logo: cropped-Logo-2-1-768x543 intégré dans l'app

## Recent Changes
- Feb 2026: Initial build of MyJantes mobile app
- Feb 2026: Thème sombre complet (noir/rouge/blanc)
- Feb 2026: Section informations véhicule + scan OCR carte grise dans formulaire devis
- Feb 2026: API admin/super_admin complètes intégrées dans lib/api.ts
- Feb 2026: Formulaire support intégré en interne (plus de redirection PWA)
- Feb 2026: Liens de paiement affichés sur factures en attente (paymentLink)
- Feb 2026: Push notifications activées (expo-notifications, polling 30s, deep linking)
- Feb 2026: CustomAlert component replaces all native Alert.alert (glassmorphism dark theme)
- Feb 2026: AI Chatbot screen added (app/(main)/chatbot.tsx) using /api/ai/assistant endpoint
- Feb 2026: FloatingSupport updated with chatbot button (sparkles icon)
