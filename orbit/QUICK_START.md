# 🚀 Quick Start Guide - Orbit Electron App

## Prerequisites

Before running the app, make sure you have:
- ✅ Node.js installed (v18 or higher)
- ✅ Google Gemini API Key

## Step 1: Add Your API Key

1. Open the `.env` file in the root directory
2. Add your Google Gemini API key:
   ```
   API_KEY=your_actual_api_key_here
   ```
3. Save the file

**Get your API key here:** https://aistudio.google.com/app/apikey

## Step 2: Run the Electron App

### Option A: Recommended (Using npm scripts)

Open a terminal in the project folder and run:

```bash
npm run electron:dev
```

This will:
1. Start the Vite development server
2. Wait for the server to be ready
3. Launch the Electron desktop app

### Option B: Run Separately (If Option A has issues)

**Terminal 1 - Start Vite server:**
```bash
npm run dev
```

Wait for the message: `Local: http://localhost:3000/`

**Terminal 2 - Start Electron:**
```bash
npm run electron
```

## Step 3: Use the App

1. **Grant Microphone Permission** when prompted
2. **Click the microphone button** at the bottom center
3. **Start talking** to Orbit!
4. View the conversation in the left panel
5. See search results and code execution in the right panel

## Troubleshooting

### Issue: Electron window doesn't open

**Solution:**
```bash
# Run these separately in two terminals:

# Terminal 1:
npm run dev

# Terminal 2 (after vite starts):
npm run electron
```

### Issue: "API_KEY is undefined" error

**Solution:**
- Make sure you've added your API key to the `.env` file
- Restart the Electron app after editing `.env`

### Issue: Microphone not working

**Solution:**
- Check Windows microphone permissions
- Allow the app to access your microphone when prompted

### Issue: 3D background not loading

**Solution:**
- Check your internet connection (Spline loads from CDN)
- Disable ad blockers or VPN if blocking external resources

## Building for Production

To create a distributable Electron app:

```bash
npm run electron:build
```

The installer will be in the `release/` folder.

## Need More Help?

Check the full documentation in `ELECTRON_README.md`

---

**Enjoy using Orbit! 🌌✨**
