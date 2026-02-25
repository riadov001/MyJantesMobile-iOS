# MyJantes - Application Mobile

## Overview
Application mobile Expo React Native pour MyJantes, un service professionnel de rénovation et personnalisation de jantes automobiles. L'app permet aux particuliers et professionnels de demander des devis gratuits en ligne. Toutes les fonctionnalités de la PWA sont disponibles sur mobile pour chaque rôle utilisateur.

## Architecture
- **Frontend**: Expo React Native (Expo Router, file-based routing)
- **Backend**: API externe hébergée sur `appmyjantes5.mytoolsgroup.eu`
- **Auth**: Sessions avec cookies (stockés via expo-secure-store / AsyncStorage)
- **State**: React Query pour les données serveur, React Context pour l'auth

## API Backend
Base URL: `https://appmyjantes5.mytoolsgroup.eu`

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
    forgot-password.tsx
  (main)/               # App principale (authentifié)
    _layout.tsx
    (tabs)/
      _layout.tsx       # Tab navigation
      index.tsx         # Accueil + dashboard admin + liste services
      quotes.tsx        # Historique des devis
      invoices.tsx      # Historique des factures
      reservations.tsx  # Historique des réservations
      messages.tsx      # Conversations chat
      notifications.tsx # Centre de notifications
      profile.tsx       # Profil utilisateur (3 tabs: Infos, Sécurité, Notifications)
      more.tsx          # Menu complet avec tous les liens admin
    new-quote.tsx       # Formulaire nouveau devis
    quote-detail.tsx    # Détail d'un devis
    invoice-detail.tsx  # Détail d'une facture
    reservation-detail.tsx # Détail d'une réservation
    chat-detail.tsx     # Conversation chat
    chatbot.tsx         # Assistant IA
    ocr-scanner.tsx     # Scanner OCR de documents
    admin-quotes.tsx    # Gestion admin devis (CRUD)
    admin-invoices.tsx  # Gestion admin factures (CRUD)
    admin-reservations.tsx # Gestion admin réservations (CRUD)
    admin-clients.tsx   # Gestion admin clients
    admin-users.tsx     # Gestion admin utilisateurs
    admin-services.tsx  # Gestion admin services (CRUD)
    admin-payments.tsx  # Gestion admin paiements + liens de paiement
    admin-repair-orders.tsx # Gestion ordres de réparation (CRUD)
    admin-credit-notes.tsx  # Gestion avoirs / notes de crédit
    admin-delivery-notes.tsx # Gestion bons de livraison
    admin-expenses.tsx  # Gestion dépenses (CRUD + catégories)
    admin-accounting.tsx # Rapports comptables (P&L, TVA, trésorerie, FEC)
    admin-reviews.tsx   # Gestion avis clients
    admin-export.tsx    # Export données + journal d'audit
    admin-engagements.tsx # Gestion engagements
    admin-garages.tsx   # Gestion garages (super_admin only)
    admin-settings.tsx  # Paramètres application
    admin-notifications.tsx # Préférences notifications admin
  support.tsx           # Formulaire de support
  legal.tsx             # Mentions légales
  privacy.tsx           # Politique de confidentialité
components/
  FloatingSupport.tsx   # Bouton flottant support
  ErrorBoundary.tsx     # Error boundary
  CustomAlert.tsx       # Alerte personnalisée glassmorphism
lib/
  api.ts                # Client API complet (28 modules API)
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

## Admin Role Check Pattern
```typescript
const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "superadmin";
const isSuperAdmin = user?.role === "super_admin" || user?.role === "superadmin";
```

## Key Technical Notes
- Detail pages use admin API endpoints for admin users, client endpoints for regular users
- Dashboard analytics uses admin quote/invoice data for revenue and status counts
- Biometric auth auto-clears expired session credentials
- API_BASE for detail pages uses `EXPO_PUBLIC_API_URL` env var with fallback to default
- All admin screens follow the same pattern: list with search/filter, CRUD modals, confirmation alerts

## Recent Changes
- Feb 2026: Initial build of MyJantes mobile app
- Feb 2026: Thème sombre complet (noir/rouge/blanc)
- Feb 2026: API admin/super_admin complètes intégrées dans lib/api.ts
- Feb 2026: Push notifications, biometric auth, AI chatbot
- Feb 2026: Admin CRUD pages: quotes, invoices, reservations, clients, users, settings
- Feb 25 2026: Added 11 new admin screens for full PWA parity: services, payments, repair orders, credit notes, delivery notes, expenses, accounting reports, reviews, export & audit, engagements, garages (super_admin)
- Feb 25 2026: Dashboard reorganized with sections: Documents, Finance, Gestion, Super Admin
- Feb 25 2026: More menu updated with all admin sections: Documents, Finance, Gestion, Super Admin
