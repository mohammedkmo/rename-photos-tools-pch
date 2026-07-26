# PCH Badging Tools

![PCH Badging Tools Interface](https://github.com/mohammedkmo/hfyc/blob/main/public/gh.jpg)

PCH Badging Tools is a Next.js application designed to streamline the process of applying for personal and vehicle badges, as well as providing tools for renaming photos according to specific formats.

## Features

- Apply for Personal Badges
- Apply for Vehicle Badges
- Rename Photos Tool
- Multi-language support (English, Arabic, Chinese)
- Anonymous realtime collaboration with private share links
- Live cursors, generated guest names, and local avatars
- Owner-only media uploads and ZIP generation

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/mohammedkmo/hfyc.git
   cd hfyc
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add the following:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```
   the main reason for this is to send messages to a telegram chat from the application to let the badging office know that a new application has been submitted.

   Media files stay in the sheet owner's browser. When collaboration is
   enabled, text fields and media-presence flags are stored in a private
   Liveblocks room so invited editors can work in realtime.

### Realtime collaboration

Collaboration uses Vercel for the application and secure API routes, and
Liveblocks for realtime room storage and presence. Add these server-only values
to `.env.local` and to **Vercel → Project Settings → Environment Variables**:

```bash
LIVEBLOCKS_SECRET_KEY=sk_...
COLLABORATION_SECRET=...
```

Generate the second value with `openssl rand -base64 48`. Never expose either
value through a `NEXT_PUBLIC_` variable.

Rooms are private. The creator receives an HttpOnly owner cookie, while an
invitation is exchanged for an HttpOnly editor cookie. Invitation tokens are
put in the URL fragment so they are not sent in normal HTTP requests or Vercel
request logs. Without accounts, owner access is tied to the browser that created
the sheet and cannot be recovered on another device.

### Running the Application

To run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
