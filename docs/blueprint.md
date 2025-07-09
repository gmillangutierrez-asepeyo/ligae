# **App Name**: Asepeyo Expenses Tracker

## Core Features:

- User Authentication: Google Sign-In for Asepeyo employees only. Access restricted to @asepeyo.es domain accounts.
- Receipt Capture: Camera activation on the main page with a visual guide for framing receipts.
- Data Extraction with Gemini: Utilize the Gemini API as a tool to extract receipt metadata: expense type, amount in euros, user email, and date.
- Data Verification: Verification page displaying the receipt image and a form with extracted metadata, allowing users to correct information.
- Receipt Gallery & Deletion: Display thumbnails with key details, allowing users to delete them by removing the image and JSON document.
- User's Token: Store user's OAuth 2.0 token. Note that access token management is client's responsibility.

## Style Guidelines:

- Primary color: Use a vibrant blue (#29ABE2) to represent trust and efficiency, aligning with Asepeyo's corporate identity, and making it obviously different from teal.
- Background color: A light blue background (#E5F5FA), desaturated from the primary color, for a clean and professional feel.
- Accent color: A contrasting yellow (#FFDA63), analogous to blue but with higher brightness and saturation, to highlight interactive elements and important information.
- Body font: 'Inter' (sans-serif) for a modern, neutral, and readable text.
- Headline font: 'Space Grotesk' (sans-serif) for headings and titles to give a techy and scientific look.
- Use clear, minimalist icons to represent expense categories.
- Mobile-first responsive design for seamless use on Android and iOS devices.