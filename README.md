# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3d5a1967-f4fc-4aac-b1db-bfb39761c6c7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3d5a1967-f4fc-4aac-b1db-bfb39761c6c7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
VITE_WOOCOMMERCE_API_URL=<https://your-store.example.com/wp-json/wc/v3>
VITE_WOOCOMMERCE_CLIENT_KEY=<your-consumer-key>
VITE_WOOCOMMERCE_SECRET_KEY=<your-consumer-secret>
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

These variables are required for the WooCommerce API client and Firebase
initialization. The application will throw an error at startup if any of them
are missing.

## Running the Express API locally

The project includes a small Express server used by the frontend. When
developing locally you need to start this API in **another terminal** in
addition to running the Vite dev server:

```sh
npm run start:server
```

Keep this process running while you use `npm run dev` so the frontend can make
requests to the API.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3d5a1967-f4fc-4aac-b1db-bfb39761c6c7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
