# Open Graph Image Generator API

This is an Express-based API that generates Open Graph (OG) images dynamically using user-provided text and images. The API processes the input, generates a composite image with text and image overlays, and uploads it to Firebase Storage, providing a public URL to access the generated image.

## Features

- **Dynamic Image Generation**: Create images with different layouts (`default`, `withBackground`, `topLeftImage`, `splitView`) based on the provided parameters.
- **Text and Image Overlays**: Combines text and images with support for multiline text and basic markdown formatting (e.g., bold, bullet points).
- **Color Adjustment**: Automatically adjusts text color based on the background image for better readability.
- **Firebase Integration**: Uploads generated images to Firebase Storage and returns a publicly accessible URL.

## Installation

### Prerequisites

- Node.js (v14 or later)
- Firebase account and project

### Setup

1. **Clone the repository**:

    ```bash
    git clone https://github.com/yourusername/og-image-generator.git
    cd og-image-generator
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Configure Firebase**:

    - Set up a Firebase project and configure Firebase Authentication and Storage.
    - Download your Firebase project configuration file and place it in `./config/firebase.ts`.

4. **Set up environment variables**:

    Create a `.env` file in the root of the project with the following content:

    ```env
    PORT=3000
    FIREBASE_API_KEY=your_firebase_api_key
    FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
    FIREBASE_PROJECT_ID=your_firebase_project_id
    FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
    FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
    FIREBASE_APP_ID=your_firebase_app_id
    ```

## Usage

### Start the Server

To start the server, run:

```bash
npm start
```
# OG Image Generator

The server will start on [http://localhost:3000](http://localhost:3000).

## API Endpoint

### POST /generate-og-image

Generates an OG image based on the provided parameters.

#### Request Body

```json
{
  "title": "Hello World",
  "content": "Welcome to our latest update...",
  "imageUrl": "https://images.unsplash.com/photo-...",
  "type": "topLeftImage"
}
```

- **title** (string): The main title text to be displayed on the image.
- **content** (string): The content or description text to be included on the image. Supports multiline and basic markdown.
- **imageUrl** (string, optional): The URL of the background or overlay image.
- **type** (string): The layout type (`default`, `withBackground`, `topLeftImage`, `splitView`).

#### Response

Success: Returns a JSON object with the public URL of the generated image.

```json
{
  "imageUrl": "https://your-firebase-storage-url/og-images/Hello-World-1616147215639.png"
}
```